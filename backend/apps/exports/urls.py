"""URLs for the exports app"""
from django.urls import path
from .views import StudentSchedulePDFView

urlpatterns = [
    path("student/schedule/pdf/", StudentSchedulePDFView.as_view(), name="student-schedule-pdf"),
]
