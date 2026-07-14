"""Faculty app models — FacultyProfile, FacultyAvailability"""
import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class Designation(models.TextChoices):
    PROFESSOR = "PROFESSOR", "Professor"
    ASSOC_PROFESSOR = "ASSOC_PROFESSOR", "Associate Professor"
    ASST_PROFESSOR = "ASST_PROFESSOR", "Assistant Professor"
    LECTURER = "LECTURER", "Lecturer"
    VISITING = "VISITING", "Visiting Faculty"
    HOD = "HOD", "Head of Department"


class FacultyProfile(models.Model):
    """Extended faculty profile linked to CustomUser"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        "authentication.CustomUser", on_delete=models.CASCADE, related_name="faculty_profile"
    )
    department = models.ForeignKey(
        "core.Department", on_delete=models.CASCADE, related_name="faculty_members"
    )
    employee_id = models.CharField(max_length=50, unique=True)
    designation = models.CharField(max_length=30, choices=Designation.choices)
    specializations = models.JSONField(default=list, help_text="List of subject areas")
    max_weekly_hours = models.PositiveSmallIntegerField(
        default=18,
        validators=[MinValueValidator(1), MaxValueValidator(40)],
        help_text="Maximum teaching hours per week"
    )
    max_daily_hours = models.PositiveSmallIntegerField(
        default=6,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text="Maximum teaching hours per day"
    )
    joining_date = models.DateField(null=True, blank=True)
    qualification = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)
    can_take_lab = models.BooleanField(default=True, help_text="Faculty can supervise lab sessions")
    preferred_subjects = models.ManyToManyField(
        "core.Subject", blank=True, related_name="preferred_faculty"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "faculty_profiles"
        ordering = ["department__name", "user__last_name"]

    def __str__(self):
        return f"{self.user.full_name} | {self.get_designation_display()} | {self.department.code}"


class FacultyAvailability(models.Model):
    """
    Faculty unavailability windows — the solver respects these as hard constraints.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    faculty = models.ForeignKey(FacultyProfile, on_delete=models.CASCADE, related_name="availability")
    day = models.IntegerField(choices=[
        (0, "Monday"), (1, "Tuesday"), (2, "Wednesday"),
        (3, "Thursday"), (4, "Friday"), (5, "Saturday")
    ])
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_available = models.BooleanField(
        default=False,
        help_text="False = unavailable in this window; True = preferred window"
    )
    reason = models.CharField(max_length=200, blank=True)
    is_recurring = models.BooleanField(default=True, help_text="Weekly recurring vs one-time")
    date = models.DateField(null=True, blank=True, help_text="Specific date (for one-time unavailability)")
    semester = models.ForeignKey(
        "scheduling.Semester", on_delete=models.CASCADE,
        null=True, blank=True, related_name="faculty_availability"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "faculty_availability"
        ordering = ["faculty", "day", "start_time"]

    def __str__(self):
        day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        status = "Available" if self.is_available else "Unavailable"
        return f"{self.faculty.user.full_name} | {day_names[self.day]} {self.start_time}-{self.end_time} | {status}"
