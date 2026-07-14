"""
Scheduling models — Semesters, Sections, Timetable generation
"""
import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class AcademicYear(models.Model):
    """Academic year e.g. 2024-25"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    year_start = models.PositiveSmallIntegerField()
    year_end = models.PositiveSmallIntegerField()
    label = models.CharField(max_length=20, unique=True, help_text="e.g. 2024-25")
    is_current = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "scheduling_academic_years"
        ordering = ["-year_start"]

    def __str__(self):
        return self.label

    def save(self, *args, **kwargs):
        if not self.label:
            self.label = f"{self.year_start}-{str(self.year_end)[-2:]}"
        if self.is_current:
            AcademicYear.objects.exclude(pk=self.pk).update(is_current=False)
        super().save(*args, **kwargs)


class SemesterType(models.TextChoices):
    ODD = "ODD", "Odd Semester"
    EVEN = "EVEN", "Even Semester"
    SUMMER = "SUMMER", "Summer Term"


class Semester(models.Model):
    """Academic semester within a year"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name="semesters")
    semester_type = models.CharField(max_length=10, choices=SemesterType.choices)
    name = models.CharField(max_length=100, help_text="e.g. 'Odd Semester 2024-25'")
    start_date = models.DateField()
    end_date = models.DateField()
    is_current = models.BooleanField(default=False)
    is_locked = models.BooleanField(default=False, help_text="Lock to prevent further edits")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "scheduling_semesters"
        ordering = ["-start_date"]
        unique_together = [("academic_year", "semester_type")]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.is_current:
            Semester.objects.exclude(pk=self.pk).update(is_current=False)
        super().save(*args, **kwargs)


class Section(models.Model):
    """
    A class section — a group of students in a program's semester.
    Sections are auto-split from oversized groups.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=20, help_text="e.g. A, B, C or CS-3A")
    program = models.ForeignKey("core.Program", on_delete=models.CASCADE, related_name="sections")
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name="sections")
    semester_number = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(12)],
        help_text="Which semester of the program (e.g. 3 = 3rd semester)"
    )
    max_students = models.PositiveIntegerField(default=60)
    current_strength = models.PositiveIntegerField(default=0)
    parent_section = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="sub_sections",
        help_text="If auto-split from another section"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "scheduling_sections"
        ordering = ["program__code", "semester_number", "name"]
        unique_together = [("name", "program", "semester", "semester_number")]

    def __str__(self):
        return f"{self.program.code} Sem-{self.semester_number} Section-{self.name}"


class SubjectAllocation(models.Model):
    """
    Assignment of a faculty member to teach a subject to a section.
    Created by admin before generating timetable.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name="allocations")
    subject = models.ForeignKey("core.Subject", on_delete=models.CASCADE, related_name="allocations")
    faculty = models.ForeignKey(
        "faculty.FacultyProfile", on_delete=models.CASCADE, related_name="allocations"
    )
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name="allocations")
    weekly_hours_override = models.PositiveSmallIntegerField(
        null=True, blank=True,
        help_text="Override subject's default weekly hours"
    )
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "scheduling_subject_allocations"
        ordering = ["section__name", "subject__name"]
        unique_together = [("subject", "section", "semester")]

    def __str__(self):
        return f"{self.subject.code} → {self.faculty.user.full_name} → {self.section}"

    @property
    def weekly_hours(self):
        return self.weekly_hours_override or self.subject.weekly_hours


class GenerationStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    RUNNING = "RUNNING", "Running"
    COMPLETED = "COMPLETED", "Completed"
    FAILED = "FAILED", "Failed"
    INFEASIBLE = "INFEASIBLE", "No Feasible Solution"
    PARTIAL = "PARTIAL", "Partial Solution"


class TimetableGeneration(models.Model):
    """
    Tracks a timetable generation job.
    One per semester. Multiple regenerations are tracked.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name="generations")
    status = models.CharField(
        max_length=20, choices=GenerationStatus.choices, default=GenerationStatus.PENDING
    )
    version = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=False, help_text="The currently active timetable")

    # Solver config & results
    config = models.JSONField(default=dict, help_text="Solver parameters used")
    solver_stats = models.JSONField(default=dict, help_text="OR-Tools solver statistics")
    conflicts = models.JSONField(default=list, help_text="Conflict explanations if infeasible")
    progress_percent = models.PositiveSmallIntegerField(default=0)

    # Timing
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    solve_time_seconds = models.FloatField(null=True, blank=True)
    celery_task_id = models.CharField(max_length=255, blank=True)

    # Audit
    triggered_by = models.ForeignKey(
        "authentication.CustomUser", on_delete=models.SET_NULL,
        null=True, related_name="triggered_generations"
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "scheduling_generations"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Timetable v{self.version} — {self.semester} [{self.status}]"

    def save(self, *args, **kwargs):
        if self.is_active:
            TimetableGeneration.objects.filter(
                semester=self.semester
            ).exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)


class TimetableSlot(models.Model):
    """
    A single scheduled class slot in the generated timetable.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    generation = models.ForeignKey(
        TimetableGeneration, on_delete=models.CASCADE, related_name="slots"
    )
    allocation = models.ForeignKey(
        SubjectAllocation, on_delete=models.CASCADE, related_name="timetable_slots"
    )
    room = models.ForeignKey("core.Room", on_delete=models.CASCADE, related_name="timetable_slots")

    # Time assignment
    time_slots = models.ManyToManyField(
        "core.TimeSlot",
        help_text="One slot for theory, up to 6 consecutive slots for labs"
    )
    day = models.IntegerField(choices=[
        (0, "Monday"), (1, "Tuesday"), (2, "Wednesday"),
        (3, "Thursday"), (4, "Friday"), (5, "Saturday")
    ])

    # Slot properties
    is_lab_block = models.BooleanField(default=False, help_text="Part of a 3-hour lab block")
    is_locked = models.BooleanField(default=False, help_text="Admin-locked, won't be moved on regeneration")
    is_manual_override = models.BooleanField(default=False, help_text="Manually placed by admin")

    # Soft constraint satisfaction
    soft_score = models.IntegerField(default=0, help_text="Soft constraint score for this slot")
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "scheduling_timetable_slots"
        ordering = ["day", "allocation__section__name"]

    def __str__(self):
        day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        return (
            f"{day_names[self.day]} | {self.allocation.subject.code} "
            f"| {self.allocation.section} | {self.room.number}"
        )
