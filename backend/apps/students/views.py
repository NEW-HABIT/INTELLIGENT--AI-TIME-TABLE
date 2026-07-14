"""Views for the students app"""
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from apps.authentication.permissions import IsAdmin, IsStudent
from apps.scheduling.models import TimetableGeneration, TimetableSlot
from .models import StudentProfile, StudentEnrollment
from .serializers import (
    StudentProfileSerializer,
    StudentEnrollmentSerializer,
    StudentTimetableSlotSerializer,
)


class StudentProfileViewSet(viewsets.ModelViewSet):
    """CRUD endpoints for student profiles (Admin only)"""
    queryset = StudentProfile.objects.select_related("user", "program").all()
    serializer_class = StudentProfileSerializer
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["program", "current_semester", "is_active"]
    search_fields = ["user__first_name", "user__last_name", "enrollment_number"]


class StudentEnrollmentViewSet(viewsets.ModelViewSet):
    """CRUD endpoints for student section enrollments (Admin only)"""
    queryset = StudentEnrollment.objects.select_related("student__user", "section__program").all()
    serializer_class = StudentEnrollmentSerializer
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["student", "section", "is_active"]


class StudentViewSet(viewsets.ViewSet):
    """Endpoints for current logged-in student"""
    permission_classes = [IsAuthenticated, IsStudent]

    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        """Get the current student's profile"""
        try:
            profile = request.user.student_profile
            serializer = StudentProfileSerializer(profile)
            return Response(serializer.data)
        except StudentProfile.DoesNotExist:
            return Response({"error": "Student profile not found"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=["get"], url_path="me/schedule")
    def me_schedule(self, request):
        """Get the weekly timetable schedule for current student's section"""
        try:
            profile = request.user.student_profile
        except StudentProfile.DoesNotExist:
            return Response({"error": "Student profile not found"}, status=status.HTTP_404_NOT_FOUND)

        # Get active enrollment to identify the student's section
        enrollment = StudentEnrollment.objects.filter(student=profile, is_active=True).first()
        if not enrollment:
            return Response({"slots": [], "message": "You are not currently enrolled in any section."})

        section = enrollment.section

        # Get the active generated timetable
        active_gen = TimetableGeneration.objects.filter(is_active=True).first()
        if not active_gen:
            return Response({"slots": [], "message": "No active timetable has been generated yet."})

        # Fetch slots scheduled for this section in the active generation
        slots = (
            TimetableSlot.objects.filter(generation=active_gen, allocation__section=section)
            .select_related("allocation__subject", "allocation__faculty__user", "room")
            .prefetch_related("time_slots")
        )

        serializer = StudentTimetableSlotSerializer(slots, many=True)
        return Response({"slots": serializer.data})

    @action(detail=False, methods=["get"], url_path="me/section")
    def me_section(self, request):
        """Get the current student's active section info"""
        try:
            profile = request.user.student_profile
        except StudentProfile.DoesNotExist:
            return Response({"error": "Student profile not found"}, status=status.HTTP_404_NOT_FOUND)

        enrollment = (
            StudentEnrollment.objects.filter(student=profile, is_active=True)
            .select_related("section__program", "section__semester")
            .first()
        )
        if not enrollment:
            return Response({"section_name": "Not Enrolled", "section_id": None})

        return Response(
            {
                "section_id": str(enrollment.section.id),
                "section_name": str(enrollment.section),
                "program_name": enrollment.section.program.name,
                "semester_number": enrollment.section.semester_number,
            }
        )
