from django.contrib.auth import authenticate
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    organizationName = serializers.CharField(source="organization_name", allow_null=True, required=False)

    class Meta:
        model = User
        fields = ["id", "name", "email", "role", "organizationName"]


class RequestRegistrationOTPSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    role = serializers.ChoiceField(choices=[User.ROLE_CUSTOMER, User.ROLE_VENDOR], default=User.ROLE_CUSTOMER)
    organizationName = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=160)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("User already registered")
        return value.lower()

    def validate(self, attrs):
        role = attrs.get("role", User.ROLE_CUSTOMER)
        org_name = (attrs.get("organizationName") or "").strip()

        if role == User.ROLE_VENDOR and len(org_name) < 2:
            raise serializers.ValidationError({"organizationName": "Organization name is required for vendors"})

        attrs["organizationName"] = org_name or None
        return attrs


class VerifyRegistrationOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.RegexField(regex=r"^\d{6}$", max_length=6, min_length=6)

    def validate_email(self, value):
        return value.lower()


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=[User.ROLE_CUSTOMER, User.ROLE_VENDOR], required=False)

    def validate(self, attrs):
        email = attrs.get("email", "").lower()
        password = attrs.get("password")
        expected_role = attrs.get("role")

        existing_user = User.objects.filter(email__iexact=email).first()
        if not existing_user:
            raise serializers.ValidationError({"detail": "User not registered. Please register first."})

        user = authenticate(request=self.context.get("request"), email=email, password=password)
        if not user:
            raise serializers.ValidationError({"detail": "Invalid password"})

        if expected_role and user.role != expected_role:
            raise serializers.ValidationError({"detail": "Account role does not match the selected login role"})

        attrs["user"] = user
        return attrs
