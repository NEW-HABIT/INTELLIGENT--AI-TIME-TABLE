from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ("email", "username", "first_name", "last_name", "role", "is_staff", "is_active")
    list_filter = ("role", "is_staff", "is_active", "is_verified")
    search_fields = ("email", "username", "first_name", "last_name")
    ordering = ("email",)
    
    # Custom fields for user details in admin panel
    fieldsets = UserAdmin.fieldsets + (
        ("Custom Fields", {"fields": ("role", "phone", "avatar", "is_verified", "notification_email", "notification_web")}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Custom Fields", {"fields": ("role", "phone", "avatar", "is_verified", "notification_email", "notification_web")}),
    )
