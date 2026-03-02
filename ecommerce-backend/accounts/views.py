import random

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from .models import PendingRegistration, User
from .serializers import (
    LoginSerializer,
    RequestRegistrationOTPSerializer,
    UserSerializer,
    VerifyRegistrationOTPSerializer,
)

OTP_TTL_MINUTES = 10
OTP_RESEND_COOLDOWN_SECONDS = 60
OTP_MAX_ATTEMPTS = 5


def token_payload_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


def generate_otp():
    return f"{random.SystemRandom().randint(100000, 999999)}"




def send_registration_otp_email(email, otp):
    subject = "Onlineदुकान Email Verification OTP"
    message = (
        "Welcome to Onlineदुकान.\n\n"
        f"Your OTP for registration is: {otp}\n"
        f"This OTP will expire in {OTP_TTL_MINUTES} minutes.\n\n"
        "If you did not request this, you can ignore this email."
    )

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.EMAIL_HOST_USER,  # ✅ MUST be Gmail you logged in with
        recipient_list=[email],
        fail_silently=False,
    )

class RequestRegistrationOTPAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RequestRegistrationOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        pending, _ = PendingRegistration.objects.get_or_create(
            email=email,
            defaults={
                "name": serializer.validated_data["name"],
                "role": serializer.validated_data.get("role", User.ROLE_CUSTOMER),
                "organization_name": serializer.validated_data.get("organizationName"),
                "password_hash": "",
            },
        )

        if not pending.can_resend(OTP_RESEND_COOLDOWN_SECONDS):
            return Response(
                {"detail": "Please wait 60 seconds before requesting a new OTP."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        pending.name = serializer.validated_data["name"]
        pending.role = serializer.validated_data.get("role", User.ROLE_CUSTOMER)
        pending.organization_name = serializer.validated_data.get("organizationName")
        pending.set_registration_password(serializer.validated_data["password"])

        otp = generate_otp()
        pending.set_otp(otp, ttl_minutes=OTP_TTL_MINUTES)
        pending.save()

        send_registration_otp_email(email, otp)

        return Response(
            {"detail": "OTP sent to your email address."},
            status=status.HTTP_200_OK,
        )


class VerifyRegistrationOTPAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyRegistrationOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        otp = serializer.validated_data["otp"]

        pending = PendingRegistration.objects.filter(email=email).first()
        if not pending:
            return Response(
                {"detail": "No pending registration found. Please request OTP first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(email__iexact=email).exists():
            pending.delete()
            return Response(
                {"detail": "User already registered"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if pending.is_otp_expired():
            return Response(
                {"detail": "OTP expired. Please request a new OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if pending.otp_attempt_count >= OTP_MAX_ATTEMPTS:
            return Response(
                {"detail": "Too many invalid attempts. Please request a new OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not pending.verify_otp(otp):
            pending.otp_attempt_count += 1
            pending.save(update_fields=["otp_attempt_count", "updated_at"])
            return Response(
                {"detail": "Invalid OTP"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User(
            email=pending.email,
            name=pending.name,
            role=pending.role,
            organization_name=pending.organization_name,
        )
        user.password = pending.password_hash
        user.date_joined = timezone.now()
        user.save()

        pending.delete()

        payload = {
            "user": UserSerializer(user).data,
            "tokens": token_payload_for_user(user),
        }
        return Response(payload, status=status.HTTP_201_CREATED)


class ResendRegistrationOTPAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        if not email:
            return Response({"detail": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email__iexact=email).exists():
            return Response({"detail": "User already registered"}, status=status.HTTP_400_BAD_REQUEST)

        pending = PendingRegistration.objects.filter(email=email).first()
        if not pending:
            return Response(
                {"detail": "No pending registration found. Please request OTP first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not pending.can_resend(OTP_RESEND_COOLDOWN_SECONDS):
            return Response(
                {"detail": "Please wait 60 seconds before requesting a new OTP."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        otp = generate_otp()
        pending.set_otp(otp, ttl_minutes=OTP_TTL_MINUTES)
        pending.save(update_fields=["otp_hash", "otp_expires_at", "otp_last_sent_at", "otp_attempt_count", "updated_at"])

        send_registration_otp_email(email, otp)

        return Response(
            {"detail": "OTP resent to your email address."},
            status=status.HTTP_200_OK,
        )


class LoginAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        payload = {
            "user": UserSerializer(user).data,
            "tokens": token_payload_for_user(user),
        }
        return Response(payload, status=status.HTTP_200_OK)


class MeAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)


class RefreshAPIView(TokenRefreshView):
    permission_classes = [permissions.AllowAny]
