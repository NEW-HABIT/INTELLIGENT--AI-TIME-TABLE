"""Scheduling views — Generate, manage timetables"""
import logging
from django.utils import timezone
from rest_framework import status, generics, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema

from .models import (
    TimetableGeneration, TimetableSlot, Semester, Section,
    SubjectAllocation, AcademicYear, GenerationStatus
)
from .serializers import (
    TimetableGenerationSerializer, TimetableSlotSerializer,
    SemesterSerializer, SectionSerializer, SubjectAllocationSerializer,
    AcademicYearSerializer, GenerationCreateSerializer,
    TimetableSlotUpdateSerializer,
)
from apps.authentication.permissions import IsAdmin, IsAdminOrFaculty

logger = logging.getLogger("apps.scheduling.views")


class AcademicYearViewSet(viewsets.ModelViewSet):
    """CRUD for academic years"""
    permission_classes = [IsAdmin]
    serializer_class = AcademicYearSerializer
    queryset = AcademicYear.objects.all().order_by("-year_start")


class SemesterViewSet(viewsets.ModelViewSet):
    """CRUD for semesters"""
    permission_classes = [IsAdmin]
    serializer_class = SemesterSerializer
    queryset = Semester.objects.select_related("academic_year").all()
    filterset_fields = ["academic_year", "is_current", "semester_type"]

    @action(detail=True, methods=["post"])
    def set_current(self, request, pk=None):
        semester = self.get_object()
        semester.is_current = True
        semester.save()
        return Response({"message": f"{semester.name} set as current semester."})


class SectionViewSet(viewsets.ModelViewSet):
    """CRUD for sections + auto-split"""
    permission_classes = [IsAdmin]
    serializer_class = SectionSerializer
    queryset = Section.objects.select_related("program", "semester").all()
    filterset_fields = ["program", "semester", "semester_number", "is_active"]

    @action(detail=False, methods=["post"])
    def auto_split(self, request):
        """Auto-split oversized sections based on room capacity"""
        section_id = request.data.get("section_id")
        max_capacity = request.data.get("max_capacity", 60)

        try:
            section = Section.objects.get(id=section_id)
        except Section.DoesNotExist:
            return Response({"error": "Section not found"}, status=404)

        if section.current_strength <= max_capacity:
            return Response({"message": "Section does not need splitting.", "split": False})

        # Calculate number of sub-sections needed
        import math
        num_sections = math.ceil(section.current_strength / max_capacity)
        students_per_section = math.ceil(section.current_strength / num_sections)

        created = []
        for i in range(num_sections):
            label = chr(65 + i)  # A, B, C, ...
            sub, created_flag = Section.objects.get_or_create(
                name=f"{section.name}{label}",
                program=section.program,
                semester=section.semester,
                semester_number=section.semester_number,
                defaults={
                    "max_students": students_per_section,
                    "current_strength": min(students_per_section, section.current_strength - i * students_per_section),
                    "parent_section": section,
                }
            )
            if created_flag:
                created.append(str(sub.id))

        return Response({
            "message": f"Section split into {num_sections} sub-sections.",
            "split": True,
            "created_sections": created,
        })


class SubjectAllocationViewSet(viewsets.ModelViewSet):
    """CRUD for subject-faculty-section allocations"""
    permission_classes = [IsAdmin]
    serializer_class = SubjectAllocationSerializer
    queryset = SubjectAllocation.objects.select_related(
        "subject", "faculty__user", "section", "semester"
    ).all()
    filterset_fields = ["semester", "section", "faculty", "subject", "is_active"]


class TimetableGenerationViewSet(viewsets.ModelViewSet):
    """Timetable generation management"""
    permission_classes = [IsAdminOrFaculty]
    queryset = TimetableGeneration.objects.select_related("semester", "triggered_by").all()
    filterset_fields = ["semester", "status", "is_active"]

    def get_serializer_class(self):
        if self.action == "create":
            return GenerationCreateSerializer
        return TimetableGenerationSerializer

    def get_permissions(self):
        if self.action in ["create", "destroy"]:
            return [IsAdmin()]
        return [IsAdminOrFaculty()]

    def create(self, request, *args, **kwargs):
        """Trigger async timetable generation"""
        serializer = GenerationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        semester_id = serializer.validated_data["semester"]
        semester = Semester.objects.get(id=semester_id)

        if semester.is_locked:
            return Response(
                {"error": "Semester is locked. Unlock it before generating."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Determine version number
        last_version = TimetableGeneration.objects.filter(
            semester=semester
        ).order_by("-version").values_list("version", flat=True).first() or 0

        generation = TimetableGeneration.objects.create(
            semester=semester,
            status=GenerationStatus.PENDING,
            version=last_version + 1,
            config=serializer.validated_data.get("config", {}),
            triggered_by=request.user,
        )

        # Dispatch Celery task
        from .tasks import generate_timetable
        task = generate_timetable.delay(str(generation.id))
        generation.celery_task_id = task.id
        generation.save(update_fields=["celery_task_id"])

        return Response(
            TimetableGenerationSerializer(generation).data,
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=["get"])
    def status_check(self, request, pk=None):
        """Poll generation status"""
        generation = self.get_object()
        return Response({
            "id": str(generation.id),
            "status": generation.status,
            "progress": generation.progress_percent,
            "message": f"Generation {generation.status.lower()}",
            "solve_time": generation.solve_time_seconds,
            "conflicts_count": len(generation.conflicts),
        })

    @action(detail=True, methods=["get"])
    def timetable(self, request, pk=None):
        """Get the full generated timetable"""
        generation = self.get_object()
        if generation.status != GenerationStatus.COMPLETED:
            return Response(
                {"error": f"Timetable not ready. Status: {generation.status}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        slots = generation.slots.select_related(
            "allocation__subject",
            "allocation__faculty__user",
            "allocation__section",
            "room",
        ).prefetch_related("time_slots").all()

        # Organize by day and section
        timetable = {}
        for slot in slots:
            day = slot.day
            section_name = str(slot.allocation.section)
            if day not in timetable:
                timetable[day] = {}
            if section_name not in timetable[day]:
                timetable[day][section_name] = []
            timetable[day][section_name].append(TimetableSlotSerializer(slot).data)

        return Response({
            "generation": TimetableGenerationSerializer(generation).data,
            "timetable": timetable,
            "total_slots": slots.count(),
        })

    @action(detail=True, methods=["get"])
    def conflicts(self, request, pk=None):
        """Get conflict explanations"""
        generation = self.get_object()
        return Response({
            "generation_id": str(generation.id),
            "status": generation.status,
            "conflicts": generation.conflicts,
            "conflicts_count": len(generation.conflicts),
        })

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        """Set this generation as the active timetable for the semester"""
        generation = self.get_object()
        if generation.status != GenerationStatus.COMPLETED:
            return Response(
                {"error": "Only completed timetables can be activated."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        generation.is_active = True
        generation.save()
        return Response({"message": "Timetable activated successfully."})


class TimetableSlotViewSet(viewsets.ModelViewSet):
    """Individual timetable slot management (manual edits)"""
    permission_classes = [IsAdmin]
    queryset = TimetableSlot.objects.select_related(
        "allocation__subject", "allocation__faculty__user",
        "allocation__section", "room", "generation"
    ).prefetch_related("time_slots")
    filterset_fields = ["generation", "day", "is_locked", "is_lab_block"]

    def get_serializer_class(self):
        if self.action in ("update", "partial_update"):
            return TimetableSlotUpdateSerializer
        return TimetableSlotSerializer

    def update(self, request, *args, **kwargs):
        """Manual slot edit — triggers incremental validation"""
        slot = self.get_object()
        serializer = TimetableSlotUpdateSerializer(slot, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        # Validate no clashes before saving
        from apps.scheduling.engine.incremental import IncrementalValidator
        validator = IncrementalValidator(slot.generation)
        conflicts = validator.validate_slot_move(
            slot=slot,
            new_room_id=request.data.get("room"),
            new_day=request.data.get("day"),
            new_slot_start=request.data.get("slot_start"),
        )

        if conflicts:
            return Response(
                {"error": "This change would create conflicts.", "conflicts": conflicts},
                status=status.HTTP_409_CONFLICT,
            )

        serializer.save(is_manual_override=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def lock(self, request, pk=None):
        """Lock a slot to prevent it being moved on regeneration"""
        slot = self.get_object()
        slot.is_locked = True
        slot.save()
        return Response({"message": "Slot locked."})

    @action(detail=True, methods=["post"])
    def unlock(self, request, pk=None):
        slot = self.get_object()
        slot.is_locked = False
        slot.save()
        return Response({"message": "Slot unlocked."})
