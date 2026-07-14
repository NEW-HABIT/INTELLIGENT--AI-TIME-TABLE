"""Audit middleware — auto-logs all write operations"""
import json
import logging
from .models import AuditLog, WRITE_METHODS

logger = logging.getLogger("apps.audit")


class AuditLogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Only log write operations from authenticated users
        if (
            request.method in WRITE_METHODS
            and hasattr(request, "user")
            and request.user.is_authenticated
            and request.path.startswith("/api/")
        ):
            try:
                action_map = {
                    "POST": "CREATE",
                    "PUT": "UPDATE",
                    "PATCH": "UPDATE",
                    "DELETE": "DELETE",
                }
                AuditLog.log(
                    user=request.user,
                    action=action_map.get(request.method, "UPDATE"),
                    endpoint=request.path,
                    method=request.method,
                    response_status=response.status_code,
                    ip_address=self._get_client_ip(request),
                    user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
                )
            except Exception as e:
                logger.warning(f"Audit log middleware error: {e}")

        return response

    def _get_client_ip(self, request):
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR")
