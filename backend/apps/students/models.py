"""Student models and URLs"""
import uuid
from django.db import models


class StudentProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField("authentication.CustomUser", on_delete=models.CASCADE, related_name="student_profile")
    enrollment_number = models.CharField(max_length=50, unique=True)
    program = models.ForeignKey("core.Program", on_delete=models.CASCADE, related_name="students")
    current_semester = models.PositiveSmallIntegerField(default=1)
    date_of_birth = models.DateField(null=True, blank=True)
    guardian_name = models.CharField(max_length=200, blank=True)
    guardian_phone = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "student_profiles"
        ordering = ["enrollment_number"]

    def __str__(self):
        return f"{self.enrollment_number} - {self.user.full_name}"


class StudentEnrollment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name="enrollments")
    section = models.ForeignKey("scheduling.Section", on_delete=models.CASCADE, related_name="enrollments")
    enrollment_date = models.DateField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "student_enrollments"
        unique_together = [("student", "section")]

    def __str__(self):
        return f"{self.student.enrollment_number} → {self.section}"
