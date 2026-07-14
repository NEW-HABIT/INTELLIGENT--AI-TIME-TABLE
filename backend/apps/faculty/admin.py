from django.contrib import admin
from .models import FacultyProfile, FacultyAvailability

@admin.register(FacultyProfile)
class FacultyProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "employee_id", "department", "designation", "max_weekly_hours", "is_active")
    search_fields = ("employee_id", "user__first_name", "user__last_name", "user__email")
    list_filter = ("designation", "is_active", "department")

@admin.register(FacultyAvailability)
class FacultyAvailabilityAdmin(admin.ModelAdmin):
    list_display = ("faculty", "day", "start_time", "end_time", "is_available", "reason")
    list_filter = ("day", "is_available")
    search_fields = ("faculty__user__first_name", "faculty__user__last_name", "faculty__employee_id")
