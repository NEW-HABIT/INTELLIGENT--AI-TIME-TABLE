"""
Core models — University master data for TNU Timetable System
Department, Program, Subject, Room, TimeSlot, Holiday
"""
import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class Department(models.Model):
    """Academic departments within the university"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, unique=True)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    head_of_department = models.ForeignKey(
        "authentication.CustomUser",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="headed_departments",
        limit_choices_to={"role": "FACULTY"},
    )
    established_year = models.PositiveIntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "core_departments"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.code})"


class DegreeType(models.TextChoices):
    BTECH = "BTECH", "B.Tech"
    MTECH = "MTECH", "M.Tech"
    MBA = "MBA", "MBA"
    BBA = "BBA", "BBA"
    BSC = "BSC", "B.Sc"
    MSC = "MSC", "M.Sc"
    PHD = "PHD", "Ph.D"
    DIPLOMA = "DIPLOMA", "Diploma"
    OTHER = "OTHER", "Other"


class Program(models.Model):
    """Academic programs/courses offered"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name="programs")
    degree_type = models.CharField(max_length=20, choices=DegreeType.choices)
    duration_years = models.PositiveSmallIntegerField(default=4)
    total_semesters = models.PositiveSmallIntegerField(default=8)
    max_students_per_section = models.PositiveIntegerField(default=60)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "core_programs"
        ordering = ["department__name", "name"]
        unique_together = [("name", "department")]

    def __str__(self):
        return f"{self.code} - {self.name}"


class SubjectType(models.TextChoices):
    THEORY = "THEORY", "Theory"
    LAB = "LAB", "Laboratory"
    TUTORIAL = "TUTORIAL", "Tutorial"
    SEMINAR = "SEMINAR", "Seminar"
    PROJECT = "PROJECT", "Project"


class DifficultyLevel(models.TextChoices):
    EASY = "EASY", "Easy"
    MEDIUM = "MEDIUM", "Medium"
    HARD = "HARD", "Hard"


class Subject(models.Model):
    """Subject/course catalog"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True)
    program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name="subjects")
    semester_number = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(12)]
    )
    credits = models.PositiveSmallIntegerField(default=3)
    subject_type = models.CharField(max_length=20, choices=SubjectType.choices, default=SubjectType.THEORY)
    weekly_hours = models.PositiveSmallIntegerField(default=3,
        help_text="Total theory hours OR 3 for lab (fixed 3-hour block)")
    lab_hours_per_week = models.PositiveSmallIntegerField(default=0,
        help_text="Lab sessions per week (each session = 3 hours)")
    difficulty_level = models.CharField(
        max_length=10, choices=DifficultyLevel.choices, default=DifficultyLevel.MEDIUM
    )
    is_elective = models.BooleanField(default=False)
    description = models.TextField(blank=True)
    syllabus_url = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "core_subjects"
        ordering = ["program__code", "semester_number", "name"]
        unique_together = [("code", "program")]

    def __str__(self):
        return f"{self.code} - {self.name} ({self.get_subject_type_display()})"

    @property
    def is_lab(self):
        return self.subject_type == SubjectType.LAB


class RoomType(models.TextChoices):
    THEORY = "THEORY", "Theory Classroom"
    LAB = "LAB", "Laboratory"
    SEMINAR = "SEMINAR", "Seminar Hall"
    AUDITORIUM = "AUDITORIUM", "Auditorium"


class Room(models.Model):
    """Physical rooms/venues in the university"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    number = models.CharField(max_length=20, unique=True, help_text="Room number e.g. B-201")
    name = models.CharField(max_length=100, blank=True, help_text="Display name e.g. Smart Class B201")
    block = models.CharField(max_length=50, blank=True, help_text="Building block e.g. Block-B")
    floor = models.PositiveSmallIntegerField(default=0)
    room_type = models.CharField(max_length=20, choices=RoomType.choices, default=RoomType.THEORY)
    capacity = models.PositiveIntegerField(default=60)
    lab_type = models.CharField(max_length=100, blank=True,
        help_text="For labs: Computer Lab, Physics Lab, Chemistry Lab etc.")
    department = models.ForeignKey(
        Department, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="rooms",
        help_text="Owning department (null = shared/common)"
    )

    # Facilities
    has_projector = models.BooleanField(default=True)
    has_smart_board = models.BooleanField(default=False)
    has_ac = models.BooleanField(default=False)
    has_computers = models.BooleanField(default=False)
    computer_count = models.PositiveSmallIntegerField(default=0)

    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "core_rooms"
        ordering = ["block", "floor", "number"]

    def __str__(self):
        return f"{self.number} ({self.get_room_type_display()}, Cap: {self.capacity})"

    @property
    def display_name(self):
        return self.name or self.number


class DayOfWeek(models.IntegerChoices):
    MONDAY = 0, "Monday"
    TUESDAY = 1, "Tuesday"
    WEDNESDAY = 2, "Wednesday"
    THURSDAY = 3, "Thursday"
    FRIDAY = 4, "Friday"
    SATURDAY = 5, "Saturday"


class SlotType(models.TextChoices):
    REGULAR = "REGULAR", "Regular Class"
    LUNCH = "LUNCH", "Lunch Break"
    BREAK = "BREAK", "Short Break"


class TimeSlot(models.Model):
    """
    Predefined time slots for the university schedule.
    University hours: 9:30 – 16:30, Lunch: 13:15 – 14:15
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    day = models.IntegerField(choices=DayOfWeek.choices)
    slot_number = models.PositiveSmallIntegerField(help_text="Ordering within the day")
    start_time = models.TimeField()
    end_time = models.TimeField()
    slot_type = models.CharField(max_length=10, choices=SlotType.choices, default=SlotType.REGULAR)
    label = models.CharField(max_length=50, blank=True, help_text="e.g. 'Period 1', 'Lunch'")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "core_time_slots"
        ordering = ["day", "slot_number"]
        unique_together = [("day", "slot_number")]

    def __str__(self):
        return f"{self.get_day_display()} | {self.start_time.strftime('%H:%M')} – {self.end_time.strftime('%H:%M')}"

    @property
    def duration_minutes(self):
        from datetime import datetime, date
        start = datetime.combine(date.today(), self.start_time)
        end = datetime.combine(date.today(), self.end_time)
        return int((end - start).total_seconds() / 60)

    @property
    def is_lunch(self):
        return self.slot_type == SlotType.LUNCH


class Holiday(models.Model):
    """University holidays and non-teaching days"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    date = models.DateField(unique=True)
    description = models.TextField(blank=True)
    is_public = models.BooleanField(default=True, help_text="Public holiday vs university-specific")
    created_by = models.ForeignKey(
        "authentication.CustomUser",
        on_delete=models.SET_NULL,
        null=True, related_name="created_holidays"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "core_holidays"
        ordering = ["date"]

    def __str__(self):
        return f"{self.name} ({self.date})"
