"""Audit URLs and views"""
from django.urls import path
from rest_framework.generics import ListAPIView
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from apps.authentication.permissions import IsAdmin
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = AuditLog
        fields = "__all__"


class AuditLogListView(ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = AuditLogSerializer
    queryset = AuditLog.objects.select_related("user").order_by("-timestamp")

    def get_queryset(self):
        qs = super().get_queryset()
        user_id = self.request.query_params.get("user")
        action = self.request.query_params.get("action")
        if user_id:
            qs = qs.filter(user_id=user_id)
        if action:
            qs = qs.filter(action=action)
        return qs


urlpatterns = [
    path("logs/", AuditLogListView.as_view(), name="audit-logs"),
]
