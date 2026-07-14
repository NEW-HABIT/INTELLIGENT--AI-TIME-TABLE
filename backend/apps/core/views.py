"""Core views — CRUD for university master data"""
from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Department, Program, Subject, Room, TimeSlot, Holiday
from .serializers import (
    DepartmentSerializer, ProgramSerializer, SubjectSerializer,
    RoomSerializer, TimeSlotSerializer, HolidaySerializer
)
from apps.authentication.permissions import IsAdmin, IsAdminOrReadOnly


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.filter(is_active=True).select_related("head_of_department")
    serializer_class = DepartmentSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "code"]
    ordering_fields = ["name", "code", "created_at"]


class ProgramViewSet(viewsets.ModelViewSet):
    queryset = Program.objects.filter(is_active=True).select_related("department")
    serializer_class = ProgramSerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_fields = ["department", "degree_type", "is_active"]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ["name", "code"]


class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.filter(is_active=True).select_related("program")
    serializer_class = SubjectSerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_fields = ["program", "semester_number", "subject_type", "is_elective"]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ["name", "code"]


class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.filter(is_active=True).select_related("department")
    serializer_class = RoomSerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_fields = ["room_type", "department", "is_active"]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ["number", "name", "block"]


class TimeSlotViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TimeSlot.objects.filter(is_active=True).order_by("day", "slot_number")
    serializer_class = TimeSlotSerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_fields = ["day", "slot_type"]


class HolidayViewSet(viewsets.ModelViewSet):
    queryset = Holiday.objects.all().order_by("date")
    serializer_class = HolidaySerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_fields = ["is_public"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
