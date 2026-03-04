from datetime import timedelta

from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True")

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CUSTOMER = "customer"
    ROLE_VENDOR = "vendor"
    ROLE_CHOICES = [
        (ROLE_CUSTOMER, "Customer"),
        (ROLE_VENDOR, "Vendor"),
    ]

    email = models.EmailField(unique=True)
    name = models.CharField(max_length=120)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_CUSTOMER)
    organization_name = models.CharField(max_length=160, blank=True, null=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        ordering = ["-date_joined"]

    def __str__(self):
        return self.email


class Vendor(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="vendor_profile",
    )
    business_name = models.CharField(max_length=160)
    login_email = models.EmailField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.business_name} ({self.user.email})"


class PendingRegistration(models.Model):
    email = models.EmailField()
    name = models.CharField(max_length=120)
    role = models.CharField(max_length=20, choices=User.ROLE_CHOICES, default=User.ROLE_CUSTOMER)
    organization_name = models.CharField(max_length=160, blank=True, null=True)

    password_hash = models.CharField(max_length=256)

    otp_hash = models.CharField(max_length=256, blank=True)
    otp_expires_at = models.DateTimeField(null=True, blank=True)
    otp_attempt_count = models.PositiveSmallIntegerField(default=0)
    otp_last_sent_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["email", "role"],
                name="unique_pending_email_per_role",
            )
        ]

    def __str__(self):
        return self.email

    def set_registration_password(self, raw_password):
        self.password_hash = make_password(raw_password)

    def set_otp(self, raw_otp, ttl_minutes=10):
        now = timezone.now()
        self.otp_hash = make_password(raw_otp)
        self.otp_expires_at = now + timedelta(minutes=ttl_minutes)
        self.otp_last_sent_at = now
        self.otp_attempt_count = 0

    def can_resend(self, cooldown_seconds=60):
        if not self.otp_last_sent_at:
            return True
        elapsed = (timezone.now() - self.otp_last_sent_at).total_seconds()
        return elapsed >= cooldown_seconds

    def is_otp_expired(self):
        if not self.otp_expires_at:
            return True
        return timezone.now() > self.otp_expires_at

    def verify_otp(self, raw_otp):
        return bool(self.otp_hash) and check_password(raw_otp, self.otp_hash)


class Product(models.Model):
    vendor = models.ForeignKey(
        Vendor,
        on_delete=models.CASCADE,
        related_name="products",
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    sku = models.CharField(max_length=80, unique=True)
    stock_quantity = models.PositiveIntegerField(default=0)
    reserved_quantity = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["vendor", "is_active"]),
            models.Index(fields=["name"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.sku})"

    @property
    def available_quantity(self):
        if self.stock_quantity <= self.reserved_quantity:
            return 0
        return self.stock_quantity - self.reserved_quantity


class Order(models.Model):
    STATUS_PENDING = "pending"
    STATUS_CONFIRMED = "confirmed"
    STATUS_SHIPPED = "shipped"
    STATUS_DELIVERED = "delivered"
    STATUS_CANCELLED = "cancelled"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_CONFIRMED, "Confirmed"),
        (STATUS_SHIPPED, "Shipped"),
        (STATUS_DELIVERED, "Delivered"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    customer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="orders",
        limit_choices_to={"role": User.ROLE_CUSTOMER},
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    subtotal_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    shipping_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    shipping_full_name = models.CharField(max_length=120, blank=True)
    shipping_phone = models.CharField(max_length=20, blank=True)
    shipping_email = models.EmailField(blank=True)
    shipping_address = models.CharField(max_length=255, blank=True)
    shipping_city = models.CharField(max_length=120, blank=True)
    shipping_state = models.CharField(max_length=120, blank=True)
    shipping_pincode = models.CharField(max_length=12, blank=True)
    cancel_reason = models.TextField(blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    placed_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-placed_at"]
        indexes = [
            models.Index(fields=["customer", "status"]),
            models.Index(fields=["placed_at"]),
        ]

    def __str__(self):
        return f"Order #{self.id} - {self.customer.email}"


class OrderShippingDetail(models.Model):
    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name="shipping_detail",
    )
    full_name = models.CharField(max_length=120)
    phone = models.CharField(max_length=20)
    email = models.EmailField()
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=120)
    state = models.CharField(max_length=120)
    pincode = models.CharField(max_length=12)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Shipping for Order #{self.order_id}"


class OrderItem(models.Model):
    VENDOR_STATUS_PENDING = "pending"
    VENDOR_STATUS_ACCEPTED = "accepted"
    VENDOR_STATUS_REJECTED = "rejected"
    VENDOR_STATUS_SHIPPED = "shipped"
    VENDOR_STATUS_CHOICES = [
        (VENDOR_STATUS_PENDING, "Pending"),
        (VENDOR_STATUS_ACCEPTED, "Accepted"),
        (VENDOR_STATUS_REJECTED, "Rejected"),
        (VENDOR_STATUS_SHIPPED, "Shipped"),
    ]

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="order_items",
    )
    vendor = models.ForeignKey(
        Vendor,
        on_delete=models.PROTECT,
        related_name="order_items",
    )
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    line_total = models.DecimalField(max_digits=12, decimal_places=2)
    product_name = models.CharField(max_length=200, blank=True)
    product_image_url = models.URLField(blank=True)
    vendor_status = models.CharField(max_length=20, choices=VENDOR_STATUS_CHOICES, default=VENDOR_STATUS_PENDING)
    vendor_action_note = models.CharField(max_length=500, blank=True)
    vendor_status_updated_at = models.DateTimeField(null=True, blank=True)
    stock_restored = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["order", "product"],
                name="unique_product_per_order",
            )
        ]

    def __str__(self):
        return f"Order #{self.order_id} - {self.product.name} x {self.quantity}"
