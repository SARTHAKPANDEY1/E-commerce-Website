from django.contrib.auth.hashers import check_password
from decimal import Decimal
from rest_framework import serializers

from .models import Order, OrderItem, OrderShippingDetail, Product, User, Vendor


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


class ProductSerializer(serializers.ModelSerializer):
    vendorId = serializers.IntegerField(source="vendor_id", read_only=True)
    stockLeft = serializers.IntegerField(source="available_quantity", read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "vendorId",
            "name",
            "description",
            "price",
            "sku",
            "stock_quantity",
            "reserved_quantity",
            "stockLeft",
            "is_active",
            "created_at",
            "updated_at",
        ]


class ProductWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            "name",
            "description",
            "price",
            "sku",
            "stock_quantity",
            "reserved_quantity",
            "is_active",
        ]


class StockUpdateSerializer(serializers.Serializer):
    stock_quantity = serializers.IntegerField(min_value=0)


class PlaceOrderItemSerializer(serializers.Serializer):
    productId = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1)
    title = serializers.CharField(required=False, allow_blank=True, max_length=200)
    price = serializers.DecimalField(required=False, max_digits=10, decimal_places=2, min_value=Decimal("0.00"))
    image = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class PlaceOrderSerializer(serializers.Serializer):
    items = PlaceOrderItemSerializer(many=True, min_length=1)
    fullName = serializers.CharField(max_length=120)
    phone = serializers.CharField(max_length=20)
    email = serializers.EmailField()
    address = serializers.CharField(max_length=255)
    city = serializers.CharField(max_length=120)
    state = serializers.CharField(max_length=120)
    pincode = serializers.CharField(max_length=12)

    def validate_pincode(self, value):
        code = str(value).strip()
        if not code.isdigit() or len(code) != 6:
            raise serializers.ValidationError("Enter 6 digit pincode")
        return code


class OrderItemSerializer(serializers.ModelSerializer):
    productId = serializers.IntegerField(source="product_id", read_only=True)
    productName = serializers.CharField(source="product.name", read_only=True)
    vendorId = serializers.IntegerField(source="vendor_id", read_only=True)
    vendorName = serializers.CharField(source="vendor.business_name", read_only=True)
    productImage = serializers.CharField(source="product_image_url", read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "productId",
            "productName",
            "productImage",
            "vendorId",
            "vendorName",
            "quantity",
            "unit_price",
            "line_total",
            "created_at",
        ]


class OrderSerializer(serializers.ModelSerializer):
    customerId = serializers.IntegerField(source="customer_id", read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)
    shippingFullName = serializers.SerializerMethodField()
    shippingPhone = serializers.SerializerMethodField()
    shippingEmail = serializers.SerializerMethodField()
    shippingAddress = serializers.SerializerMethodField()
    shippingCity = serializers.SerializerMethodField()
    shippingState = serializers.SerializerMethodField()
    shippingPincode = serializers.SerializerMethodField()
    cancelReason = serializers.CharField(source="cancel_reason", read_only=True)
    cancelledAt = serializers.DateTimeField(source="cancelled_at", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "customerId",
            "status",
            "subtotal_amount",
            "shipping_amount",
            "total_amount",
            "placed_at",
            "updated_at",
            "shippingFullName",
            "shippingPhone",
            "shippingEmail",
            "shippingAddress",
            "shippingCity",
            "shippingState",
            "shippingPincode",
            "cancelReason",
            "cancelledAt",
            "items",
        ]

    def _shipping(self, obj):
        shipping = getattr(obj, "shipping_detail", None)
        if shipping:
            return shipping
        # Backward compatibility for older orders created before dedicated model.
        return OrderShippingDetail(
            full_name=obj.shipping_full_name or "",
            phone=obj.shipping_phone or "",
            email=obj.shipping_email or "",
            address=obj.shipping_address or "",
            city=obj.shipping_city or "",
            state=obj.shipping_state or "",
            pincode=obj.shipping_pincode or "",
        )

    def get_shippingFullName(self, obj):
        return self._shipping(obj).full_name

    def get_shippingPhone(self, obj):
        return self._shipping(obj).phone

    def get_shippingEmail(self, obj):
        return self._shipping(obj).email

    def get_shippingAddress(self, obj):
        return self._shipping(obj).address

    def get_shippingCity(self, obj):
        return self._shipping(obj).city

    def get_shippingState(self, obj):
        return self._shipping(obj).state

    def get_shippingPincode(self, obj):
        return self._shipping(obj).pincode


class CancelOrderSerializer(serializers.Serializer):
    reason = serializers.CharField(min_length=5, max_length=500)
