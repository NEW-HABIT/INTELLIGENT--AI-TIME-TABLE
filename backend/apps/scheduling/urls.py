from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('academic-years', views.AcademicYearViewSet)
router.register('semesters', views.SemesterViewSet)
router.register('sections', views.SectionViewSet)
router.register('allocations', views.SubjectAllocationViewSet)
router.register('scheduling/generations', views.TimetableGenerationViewSet)
router.register('scheduling/slots', views.TimetableSlotViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
