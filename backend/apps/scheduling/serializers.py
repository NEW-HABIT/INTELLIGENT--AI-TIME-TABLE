"""Scheduling serializers"""
from rest_framework import serializers
from .models import (
    AcademicYear, Semester, Section, SubjectAllocation,
    TimetableGeneration, TimetableSlot
)


class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = "__all__"


class SemesterSerializer(serializers.ModelSerializer):
    academic_year_label = serializers.CharField(source="academic_year.label", read_only=True)

    class Meta:
        model = Semester
        fields = "__all__"


class SectionSerializer(serializers.ModelSerializer):
    program_name = serializers.CharField(source="program.name", read_only=True)
    program_code = serializers.CharField(source="program.code", read_only=True)
    semester_name = serializers.CharField(source="semester.name", read_only=True)

    class Meta:
        model = Section
        fields = "__all__"


class SubjectAllocationSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    subject_code = serializers.CharField(source="subject.code", read_only=True)
    faculty_name = serializers.CharField(source="faculty.user.full_name", read_only=True)
    section_name = serializers.SerializerMethodField()
    weekly_hours = serializers.IntegerField(read_only=True)

    class Meta:
        model = SubjectAllocation
        fields = "__all__"

    def get_section_name(self, obj):
        return str(obj.section)


class TimetableGenerationSerializer(serializers.ModelSerializer):
    semester_name = serializers.CharField(source="semester.name", read_only=True)
    triggered_by_name = serializers.SerializerMethodField()

    class Meta:
        model = TimetableGeneration
        fields = "__all__"

    def get_triggered_by_name(self, obj):
        return obj.triggered_by.full_name if obj.triggered_by else None


class GenerationCreateSerializer(serializers.Serializer):
    semester = serializers.UUIDField()
    config = serializers.DictField(required=False, default=dict)


class TimetableSlotSerializer(serializers.ModelSerializer):
    subject_code = serializers.CharField(source="allocation.subject.code", read_only=True)
    subject_name = serializers.CharField(source="allocation.subject.name", read_only=True)
    faculty_name = serializers.CharField(source="allocation.faculty.user.full_name", read_only=True)
    section_name = serializers.SerializerMethodField()
    room_number = serializers.CharField(source="room.number", read_only=True)
    room_capacity = serializers.IntegerField(source="room.capacity", read_only=True)
    time_slots_data = serializers.SerializerMethodField()

    class Meta:
        model = TimetableSlot
        fields = "__all__"

    def get_section_name(self, obj):
        return str(obj.allocation.section)

    def get_time_slots_data(self, obj):
        slots = obj.time_slots.order_by("slot_number")
        if not slots:
            return {}
        return {
            "start_time": slots.first().start_time.strftime("%H:%M"),
            "end_time": slots.last().end_time.strftime("%H:%M"),
            "count": slots.count(),
        }


class TimetableSlotUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimetableSlot
        fields = ["room", "day", "is_locked", "notes"]
