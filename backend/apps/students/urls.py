"""URLs for the students app"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudentProfileViewSet, StudentEnrollmentViewSet, StudentViewSet

router = DefaultRouter()
router.register("students", StudentProfileViewSet, basename="students")
router.register("student-enrollments", StudentEnrollmentViewSet, basename="student-enrollment")
router.register("student", StudentViewSet, basename="student")

urlpatterns = [
    path("", include(router.urls)),
]
