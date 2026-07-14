"""Serializers for the students app"""
from rest_framework import serializers
from apps.scheduling.models import TimetableSlot
from .models import StudentProfile, StudentEnrollment


class StudentProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    program_name = serializers.CharField(source="program.name", read_only=True)
    program_code = serializers.CharField(source="program.code", read_only=True)

    class Meta:
        model = StudentProfile
        fields = [
            "id",
            "user",
            "full_name",
            "email",
            "enrollment_number",
            "program",
            "program_name",
            "program_code",
            "current_semester",
            "date_of_birth",
            "guardian_name",
            "guardian_phone",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class StudentEnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.full_name", read_only=True)
    student_enrollment_number = serializers.CharField(source="student.enrollment_number", read_only=True)
    section_name = serializers.CharField(source="section.name", read_only=True)
    section_display = serializers.SerializerMethodField()

    class Meta:
        model = StudentEnrollment
        fields = [
            "id",
            "student",
            "student_name",
            "student_enrollment_number",
            "section",
            "section_name",
            "section_display",
            "enrollment_date",
            "is_active",
        ]
        read_only_fields = ["id", "enrollment_date"]

    def get_section_display(self, obj):
        return str(obj.section)


class StudentTimetableSlotSerializer(serializers.ModelSerializer):
    subject = serializers.SerializerMethodField()
    faculty = serializers.SerializerMethodField()
    room = serializers.SerializerMethodField()
    start_time = serializers.SerializerMethodField()
    end_time = serializers.SerializerMethodField()
    is_lab = serializers.BooleanField(source="is_lab_block")

    class Meta:
        model = TimetableSlot
        fields = [
            "id",
            "day",
            "subject",
            "faculty",
            "room",
            "start_time",
            "end_time",
            "is_lab",
            "is_locked",
        ]

    def get_subject(self, obj):
        return {
            "name": obj.allocation.subject.name,
            "code": obj.allocation.subject.code,
        }

    def get_faculty(self, obj):
        return {
            "name": obj.allocation.faculty.user.full_name,
        }

    def get_room(self, obj):
        return {
            "number": obj.room.number,
        }

    def get_start_time(self, obj):
        first_slot = obj.time_slots.order_by("slot_number").first()
        return first_slot.start_time.strftime("%H:%M") if first_slot else ""

    def get_end_time(self, obj):
        last_slot = obj.time_slots.order_by("slot_number").last()
        return last_slot.end_time.strftime("%H:%M") if last_slot else ""
