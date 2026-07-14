from django.contrib import admin
from .models import Department, Program, Subject, Room, TimeSlot, Holiday

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "head_of_department", "established_year", "is_active")
    search_fields = ("name", "code")
    list_filter = ("is_active",)

@admin.register(Program)
class ProgramAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "department", "degree_type", "duration_years", "is_active")
    search_fields = ("name", "code")
    list_filter = ("degree_type", "is_active", "department")

@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "program", "semester_number", "credits", "subject_type", "weekly_hours", "is_active")
    search_fields = ("name", "code")
    list_filter = ("subject_type", "semester_number", "is_active", "program")

@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ("number", "name", "block", "floor", "room_type", "capacity", "is_active")
    search_fields = ("number", "name", "block")
    list_filter = ("room_type", "is_active", "block")

@admin.register(TimeSlot)
class TimeSlotAdmin(admin.ModelAdmin):
    list_display = ("day", "slot_number", "start_time", "end_time", "slot_type", "label", "is_active")
    list_filter = ("day", "slot_type", "is_active")
    ordering = ("day", "slot_number")

@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    list_display = ("name", "date", "is_public", "created_by")
    search_fields = ("name",)
    list_filter = ("is_public", "date")
