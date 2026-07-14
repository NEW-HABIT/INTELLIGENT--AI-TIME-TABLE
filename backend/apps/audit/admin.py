from django.contrib import admin
from .models import AuditLog

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("user", "action", "model_name", "object_id", "response_status", "ip_address", "timestamp")
    list_filter = ("action", "response_status", "timestamp")
    search_fields = ("user__email", "model_name", "object_id", "object_repr")
    readonly_fields = [field.name for field in AuditLog._meta.fields]
    
    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
