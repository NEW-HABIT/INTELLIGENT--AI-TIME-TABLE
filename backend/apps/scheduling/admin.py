from django.contrib import admin
from .models import AcademicYear, Semester, Section, SubjectAllocation, TimetableGeneration, TimetableSlot

@admin.register(AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    list_display = ("label", "year_start", "year_end", "is_current")
    list_filter = ("is_current",)

@admin.register(Semester)
class SemesterAdmin(admin.ModelAdmin):
    list_display = ("name", "academic_year", "semester_type", "start_date", "end_date", "is_current", "is_locked")
    list_filter = ("semester_type", "is_current", "is_locked", "academic_year")

@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ("name", "program", "semester", "semester_number", "max_students", "current_strength", "is_active")
    list_filter = ("semester_number", "is_active", "program", "semester")
    search_fields = ("name",)

@admin.register(SubjectAllocation)
class SubjectAllocationAdmin(admin.ModelAdmin):
    list_display = ("subject", "faculty", "section", "semester", "weekly_hours_override", "is_active")
    list_filter = ("is_active", "semester", "section", "faculty")
    search_fields = ("subject__name", "subject__code", "faculty__user__first_name", "faculty__user__last_name")

@admin.register(TimetableGeneration)
class TimetableGenerationAdmin(admin.ModelAdmin):
    list_display = ("semester", "status", "version", "is_active", "progress_percent", "solve_time_seconds", "created_at")
    list_filter = ("status", "is_active", "semester")

@admin.register(TimetableSlot)
class TimetableSlotAdmin(admin.ModelAdmin):
    list_display = ("allocation", "room", "day", "is_lab_block", "is_locked", "is_manual_override")
    list_filter = ("day", "is_lab_block", "is_locked", "is_manual_override", "room")
    search_fields = ("allocation__subject__name", "allocation__subject__code", "room__number")
