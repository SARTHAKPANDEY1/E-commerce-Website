from django.contrib.auth.hashers import check_password
from rest_framework import serializers

from .models import User, Vendor


class UserSerializer(serializers.ModelSerializer):
    organizationName = serializers.CharField(source="organization_name", allow_null=True, required=False)
    email = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "name", "email", "role", "organizationName"]

    def get_email(self, obj):
        if obj.role == User.ROLE_VENDOR and hasattr(obj, "vendor_profile"):
            return obj.vendor_profile.login_email
        return obj.email


class RequestRegistrationOTPSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    role = serializers.ChoiceField(choices=[User.ROLE_CUSTOMER, User.ROLE_VENDOR], default=User.ROLE_CUSTOMER)
    organizationName = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=160)

    def validate(self, attrs):
        email = attrs.get("email", "").lower()
        role = attrs.get("role", User.ROLE_CUSTOMER)
        org_name = (attrs.get("organizationName") or "").strip()

        if role == User.ROLE_VENDOR:
            if Vendor.objects.filter(login_email__iexact=email).exists():
                raise serializers.ValidationError({"email": "User already registered"})
        elif User.objects.filter(email__iexact=email, role=User.ROLE_CUSTOMER).exists():
            raise serializers.ValidationError({"email": "User already registered"})

        if role == User.ROLE_VENDOR and len(org_name) < 2:
            raise serializers.ValidationError({"organizationName": "Organization name is required for vendors"})

        attrs["email"] = email
        attrs["organizationName"] = org_name or None
        return attrs


class VerifyRegistrationOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.RegexField(regex=r"^\d{6}$", max_length=6, min_length=6)
    role = serializers.ChoiceField(choices=[User.ROLE_CUSTOMER, User.ROLE_VENDOR], default=User.ROLE_CUSTOMER)

    def validate_email(self, value):
        return value.lower()


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=[User.ROLE_CUSTOMER, User.ROLE_VENDOR], default=User.ROLE_CUSTOMER)

    def validate(self, attrs):
        email = attrs.get("email", "").lower()
        password = attrs.get("password")
        expected_role = attrs.get("role", User.ROLE_CUSTOMER)

        if expected_role == User.ROLE_VENDOR:
            vendor = Vendor.objects.select_related("user").filter(login_email__iexact=email).first()
            existing_user = vendor.user if vendor else None
        else:
            existing_user = User.objects.filter(email__iexact=email, role=User.ROLE_CUSTOMER).first()

        if not existing_user:
            role_label = "vendor" if expected_role == User.ROLE_VENDOR else "customer"
            raise serializers.ValidationError({"detail": f"{role_label.title()} account not registered. Please register first."})

        if not check_password(password, existing_user.password):
            raise serializers.ValidationError({"detail": "Invalid password"})

        attrs["user"] = existing_user
        return attrs
