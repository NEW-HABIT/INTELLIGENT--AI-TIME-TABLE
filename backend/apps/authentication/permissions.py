"""Custom DRF permission classes for RBAC"""
from rest_framework.permissions import BasePermission
from .models import UserRole


class IsAdmin(BasePermission):
    """Only administrators can access"""
    message = "You must be an administrator to perform this action."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.ADMIN
        )


class IsFaculty(BasePermission):
    """Only faculty members can access"""
    message = "You must be a faculty member to perform this action."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.FACULTY
        )


class IsStudent(BasePermission):
    """Only students can access"""
    message = "You must be a student to perform this action."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.STUDENT
        )


class IsAdminOrReadOnly(BasePermission):
    """Admins can read/write; others can only read"""
    message = "You must be an administrator to modify this resource."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return request.user.role == UserRole.ADMIN


class IsAdminOrFaculty(BasePermission):
    """Admins and faculty members can access"""
    message = "This action requires admin or faculty privileges."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in (UserRole.ADMIN, UserRole.FACULTY)
        )


class IsOwnerOrAdmin(BasePermission):
    """Object-level: only owner or admin"""
    message = "You do not have permission to access this resource."

    def has_object_permission(self, request, view, obj):
        if request.user.role == UserRole.ADMIN:
            return True
        return getattr(obj, "user", obj) == request.user
