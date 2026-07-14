"""Audit log middleware and models"""
import uuid
import json
import logging
from django.db import models
from django.utils import timezone

logger = logging.getLogger("apps.audit")

WRITE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


class AuditLog(models.Model):
    """Records all write operations for compliance and debugging"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        "authentication.CustomUser",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="audit_logs"
    )
    action = models.CharField(max_length=20, choices=[
        ("CREATE", "Create"), ("UPDATE", "Update"),
        ("DELETE", "Delete"), ("LOGIN", "Login"),
        ("LOGOUT", "Logout"), ("GENERATE", "Generate Timetable"),
        ("EXPORT", "Export"), ("AI_CHAT", "AI Chat"),
    ])
    model_name = models.CharField(max_length=100, blank=True)
    object_id = models.CharField(max_length=255, blank=True)
    object_repr = models.CharField(max_length=500, blank=True)
    changes = models.JSONField(default=dict, help_text="What changed: {field: [old, new]}")
    extra_data = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)
    endpoint = models.CharField(max_length=500, blank=True)
    method = models.CharField(max_length=10, blank=True)
    response_status = models.PositiveSmallIntegerField(null=True, blank=True)
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = "audit_logs"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["user", "timestamp"]),
            models.Index(fields=["action", "timestamp"]),
            models.Index(fields=["model_name", "object_id"]),
        ]

    def __str__(self):
        user_str = self.user.email if self.user else "Anonymous"
        return f"{user_str} | {self.action} | {self.model_name} | {self.timestamp:%Y-%m-%d %H:%M}"

    @classmethod
    def log(cls, user, action, model_name="", object_id="", object_repr="",
            changes=None, extra_data=None, ip_address=None, endpoint="",
            method="", response_status=None, user_agent=""):
        try:
            cls.objects.create(
                user=user,
                action=action,
                model_name=model_name,
                object_id=str(object_id),
                object_repr=object_repr[:500],
                changes=changes or {},
                extra_data=extra_data or {},
                ip_address=ip_address,
                endpoint=endpoint[:500],
                method=method,
                response_status=response_status,
                user_agent=user_agent[:500],
            )
        except Exception as e:
            logger.error(f"Failed to create audit log: {e}")
