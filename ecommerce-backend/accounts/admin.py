from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import PendingRegistration, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ("-date_joined",)
    list_display = ("id", "email", "name", "role", "is_staff", "is_active")
    search_fields = ("email", "name", "organization_name")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal Info", {"fields": ("name", "role", "organization_name")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "name", "role", "organization_name", "password1", "password2", "is_staff", "is_superuser"),
            },
        ),
    )


@admin.register(PendingRegistration)
class PendingRegistrationAdmin(admin.ModelAdmin):
    list_display = ("email", "name", "role", "otp_expires_at", "otp_attempt_count", "otp_last_sent_at", "updated_at")
    search_fields = ("email", "name")
    readonly_fields = ("created_at", "updated_at")
