from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .analytics import AnalyticsViewSet

router = DefaultRouter()
router.register('departments', views.DepartmentViewSet)
router.register('programs', views.ProgramViewSet)
router.register('subjects', views.SubjectViewSet)
router.register('rooms', views.RoomViewSet)
router.register('timeslots', views.TimeSlotViewSet)
router.register('holidays', views.HolidayViewSet)
router.register('analytics', AnalyticsViewSet, basename='analytics')

urlpatterns = [
    path('', include(router.urls)),
]
