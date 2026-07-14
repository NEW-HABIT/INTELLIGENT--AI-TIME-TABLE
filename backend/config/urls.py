"""Root URL configuration for TNU Timetable System"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    # Django Admin
    path("django-admin/", admin.site.urls),

    # API Documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/schema/swagger-ui/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/schema/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),

    # Application APIs
    path("api/auth/", include("apps.authentication.urls")),
    path("api/", include("apps.core.urls")),
    path("api/", include("apps.scheduling.urls")),
    path("api/", include("apps.faculty.urls")),
    path("api/", include("apps.students.urls")),
    path("api/ai/", include("apps.ai_assistant.urls")),
    path("api/export/", include("apps.exports.urls")),
    path("api/audit/", include("apps.audit.urls")),



    # Celery results
    path("api/celery/", include("django_celery_results.urls")),
]

# Silk profiler (dev only)
if "silk" in settings.INSTALLED_APPS:
    urlpatterns += [
        path("silk/", include("silk.urls", namespace="silk")),
    ]


# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Customize admin site
admin.site.site_header = "The Neotia University — Timetable Administration"
admin.site.site_title = "TNU Timetable Admin"
admin.site.index_title = "Welcome to TNU Timetable Management System"
