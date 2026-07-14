from django.contrib import admin
from .models import StudentProfile, StudentEnrollment

@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "enrollment_number", "program", "current_semester", "is_active")
    search_fields = ("enrollment_number", "user__first_name", "user__last_name", "user__email")
    list_filter = ("current_semester", "is_active", "program")

@admin.register(StudentEnrollment)
class StudentEnrollmentAdmin(admin.ModelAdmin):
    list_display = ("student", "section", "enrollment_date", "is_active")
    list_filter = ("is_active", "section")
    search_fields = ("student__enrollment_number", "student__user__first_name", "student__user__last_name")
