"""Faculty app — views, serializers, URLs"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework import viewsets, serializers, generics, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from apps.authentication.permissions import IsAdmin, IsAdminOrFaculty, IsOwnerOrAdmin
from .models import FacultyProfile, FacultyAvailability


class FacultyProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = FacultyProfile
        fields = "__all__"


class FacultyAvailabilitySerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(source="faculty.user.full_name", read_only=True)

    class Meta:
        model = FacultyAvailability
        fields = "__all__"


class FacultyProfileViewSet(viewsets.ModelViewSet):
    queryset = FacultyProfile.objects.filter(is_active=True).select_related("user", "department")
    serializer_class = FacultyProfileSerializer
    permission_classes = [IsAdminOrFaculty]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["department", "designation"]
    search_fields = ["user__first_name", "user__last_name", "employee_id"]

    @action(detail=False, methods=["get"])
    def me(self, request):
        """Get current faculty member's profile"""
        try:
            profile = request.user.faculty_profile
            return Response(FacultyProfileSerializer(profile).data)
        except FacultyProfile.DoesNotExist:
            return Response({"error": "Faculty profile not found"}, status=404)

    @action(detail=False, methods=["get"])
    def me_schedule(self, request):
        """Get current faculty member's timetable"""
        from apps.scheduling.models import TimetableGeneration, TimetableSlot
        from apps.scheduling.serializers import TimetableSlotSerializer
        try:
            profile = request.user.faculty_profile
        except FacultyProfile.DoesNotExist:
            return Response({"error": "Faculty profile not found"}, status=404)

        active_gen = TimetableGeneration.objects.filter(is_active=True).first()
        if not active_gen:
            return Response({"slots": [], "message": "No active timetable"})

        slots = TimetableSlot.objects.filter(
            generation=active_gen,
            allocation__faculty=profile,
        ).select_related("allocation__subject", "allocation__section", "room").prefetch_related("time_slots")

        return Response({"slots": TimetableSlotSerializer(slots, many=True).data})

    @action(detail=False, methods=["get"])
    def me_workload(self, request):
        """Get current faculty's workload summary"""
        from apps.scheduling.models import SubjectAllocation
        try:
            profile = request.user.faculty_profile
        except FacultyProfile.DoesNotExist:
            return Response({"error": "Not found"}, status=404)

        allocs = SubjectAllocation.objects.filter(
            faculty=profile, is_active=True
        ).select_related("subject", "section", "semester")

        total_hours = sum(a.weekly_hours for a in allocs)
        return Response({
            "faculty": FacultyProfileSerializer(profile).data,
            "total_weekly_hours": total_hours,
            "max_weekly_hours": profile.max_weekly_hours,
            "utilization_percent": round((total_hours / profile.max_weekly_hours) * 100, 1) if profile.max_weekly_hours else 0,
            "allocations": [
                {
                    "subject": a.subject.name,
                    "code": a.subject.code,
                    "section": str(a.section),
                    "weekly_hours": a.weekly_hours,
                }
                for a in allocs
            ],
        })


class FacultyAvailabilityViewSet(viewsets.ModelViewSet):
    queryset = FacultyAvailability.objects.select_related("faculty__user")
    serializer_class = FacultyAvailabilitySerializer
    permission_classes = [IsAdminOrFaculty]
    filterset_fields = ["faculty", "day", "is_available"]


router = DefaultRouter()
router.register("faculty", FacultyProfileViewSet)
router.register("faculty-availability", FacultyAvailabilityViewSet)

urlpatterns = [path("", include(router.urls))]
