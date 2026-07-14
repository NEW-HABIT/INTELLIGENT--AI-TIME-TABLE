"""Core serializers"""
from rest_framework import serializers
from .models import Department, Program, Subject, Room, TimeSlot, Holiday


class DepartmentSerializer(serializers.ModelSerializer):
    head_name = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = "__all__"

    def get_head_name(self, obj):
        return obj.head_of_department.full_name if obj.head_of_department else None


class ProgramSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = Program
        fields = "__all__"


class SubjectSerializer(serializers.ModelSerializer):
    program_name = serializers.CharField(source="program.name", read_only=True)
    is_lab = serializers.BooleanField(read_only=True)

    class Meta:
        model = Subject
        fields = "__all__"


class RoomSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = Room
        fields = "__all__"


class TimeSlotSerializer(serializers.ModelSerializer):
    day_name = serializers.SerializerMethodField()
    duration_minutes = serializers.IntegerField(read_only=True)

    class Meta:
        model = TimeSlot
        fields = "__all__"

    def get_day_name(self, obj):
        return obj.get_day_display()


class HolidaySerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Holiday
        fields = "__all__"
        read_only_fields = ["created_by"]

    def get_created_by_name(self, obj):
        return obj.created_by.full_name if obj.created_by else None
