from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import Order, OrderItem, PendingRegistration, Product, User, Vendor


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


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ("id", "business_name", "user", "created_at")
    search_fields = ("business_name", "user__email", "user__name")


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "vendor",
        "sku",
        "price",
        "stock_quantity",
        "reserved_quantity",
        "is_active",
        "updated_at",
    )
    list_filter = ("is_active", "vendor")
    search_fields = ("name", "sku", "vendor__business_name", "vendor__user__email")


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "customer", "status", "subtotal_amount", "shipping_amount", "total_amount", "placed_at")
    list_filter = ("status", "placed_at")
    search_fields = ("id", "customer__email", "customer__name")
    inlines = [OrderItemInline]


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "product", "vendor", "quantity", "unit_price", "line_total", "created_at")
    list_filter = ("vendor", "created_at")
    search_fields = ("order__id", "product__name", "product__sku", "vendor__business_name")
