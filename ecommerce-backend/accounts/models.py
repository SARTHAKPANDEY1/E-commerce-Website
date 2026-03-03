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
