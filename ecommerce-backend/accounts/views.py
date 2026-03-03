import random
import json
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import login
from django.core.mail import send_mail
from django.db import transaction
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
import requests

from .models import Order, OrderItem, OrderShippingDetail, PendingRegistration, Product, User, Vendor
from .serializers import (
    CancelOrderSerializer,
    LoginSerializer,
    OrderSerializer,
    PlaceOrderSerializer,
    ProductSerializer,
    ProductWriteSerializer,
    RequestRegistrationOTPSerializer,
    StockUpdateSerializer,
    UserSerializer,
    VerifyRegistrationOTPSerializer,
)

OTP_TTL_MINUTES = 10
OTP_RESEND_COOLDOWN_SECONDS = 60
OTP_MAX_ATTEMPTS = 5


class IsCustomer(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == User.ROLE_CUSTOMER)


class IsVendor(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == User.ROLE_VENDOR)


def token_payload_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


def generate_otp():
    return f"{random.SystemRandom().randint(100000, 999999)}"


def build_vendor_auth_email(login_email):
    normalized = str(login_email).strip().lower()
    base = f"vendor+{normalized}@onlinedukan.local"
    candidate = base
    idx = 1
    while User.objects.filter(email=candidate).exists():
        idx += 1
        candidate = f"vendor+{idx}+{normalized}@onlinedukan.local"
    return candidate




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
        role = serializer.validated_data.get("role", User.ROLE_CUSTOMER)
        pending, _ = PendingRegistration.objects.get_or_create(
            email=email,
            role=role,
            defaults={
                "name": serializer.validated_data["name"],
                "role": role,
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
        pending.role = role
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
        role = serializer.validated_data.get("role", User.ROLE_CUSTOMER)

        pending = PendingRegistration.objects.filter(email=email, role=role).first()
        if not pending:
            return Response(
                {"detail": "No pending registration found. Please request OTP first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if role == User.ROLE_VENDOR:
            if Vendor.objects.filter(login_email__iexact=email).exists():
                pending.delete()
                return Response(
                    {"detail": "User already registered"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        elif User.objects.filter(email__iexact=email, role=User.ROLE_CUSTOMER).exists():
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

        user_email = pending.email
        if pending.role == User.ROLE_VENDOR:
            user_email = build_vendor_auth_email(pending.email)

        user = User(
            email=user_email,
            name=pending.name,
            role=pending.role,
            organization_name=pending.organization_name,
        )
        user.password = pending.password_hash
        user.date_joined = timezone.now()
        user.save()

        if user.role == User.ROLE_VENDOR:
            Vendor.objects.update_or_create(
                user=user,
                defaults={
                    "business_name": user.organization_name or user.name,
                    "login_email": pending.email,
                },
            )

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
        role = str(request.data.get("role", User.ROLE_CUSTOMER)).strip().lower() or User.ROLE_CUSTOMER
        if not email:
            return Response({"detail": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
        if role not in {User.ROLE_CUSTOMER, User.ROLE_VENDOR}:
            return Response({"detail": "Invalid role"}, status=status.HTTP_400_BAD_REQUEST)

        if role == User.ROLE_VENDOR:
            if Vendor.objects.filter(login_email__iexact=email).exists():
                return Response({"detail": "User already registered"}, status=status.HTTP_400_BAD_REQUEST)
        elif User.objects.filter(email__iexact=email, role=User.ROLE_CUSTOMER).exists():
            return Response({"detail": "User already registered"}, status=status.HTTP_400_BAD_REQUEST)

        pending = PendingRegistration.objects.filter(email=email, role=role).first()
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


class VendorProductListCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsVendor]

    def get(self, request):
        vendor = getattr(request.user, "vendor_profile", None)
        if not vendor:
            return Response({"detail": "Vendor profile not found"}, status=status.HTTP_400_BAD_REQUEST)

        products = Product.objects.filter(vendor=vendor).order_by("-created_at")
        return Response(ProductSerializer(products, many=True).data, status=status.HTTP_200_OK)

    def post(self, request):
        vendor = getattr(request.user, "vendor_profile", None)
        if not vendor:
            return Response({"detail": "Vendor profile not found"}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ProductWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = serializer.save(vendor=vendor)
        return Response(ProductSerializer(product).data, status=status.HTTP_201_CREATED)


class VendorProductDetailAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsVendor]

    def _get_product(self, request, product_id):
        vendor = getattr(request.user, "vendor_profile", None)
        if not vendor:
            return None
        return Product.objects.filter(id=product_id, vendor=vendor).first()

    def get(self, request, product_id):
        product = self._get_product(request, product_id)
        if not product:
            return Response({"detail": "Product not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(ProductSerializer(product).data, status=status.HTTP_200_OK)

    def put(self, request, product_id):
        product = self._get_product(request, product_id)
        if not product:
            return Response({"detail": "Product not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = ProductWriteSerializer(product, data=request.data)
        serializer.is_valid(raise_exception=True)
        product = serializer.save()
        return Response(ProductSerializer(product).data, status=status.HTTP_200_OK)

    def patch(self, request, product_id):
        product = self._get_product(request, product_id)
        if not product:
            return Response({"detail": "Product not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = ProductWriteSerializer(product, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        product = serializer.save()
        return Response(ProductSerializer(product).data, status=status.HTTP_200_OK)

    def delete(self, request, product_id):
        product = self._get_product(request, product_id)
        if not product:
            return Response({"detail": "Product not found"}, status=status.HTTP_404_NOT_FOUND)
        product.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class VendorProductStockUpdateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsVendor]

    def patch(self, request, product_id):
        vendor = getattr(request.user, "vendor_profile", None)
        if not vendor:
            return Response({"detail": "Vendor profile not found"}, status=status.HTTP_400_BAD_REQUEST)

        product = Product.objects.filter(id=product_id, vendor=vendor).first()
        if not product:
            return Response({"detail": "Product not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = StockUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product.stock_quantity = serializer.validated_data["stock_quantity"]
        if product.reserved_quantity > product.stock_quantity:
            product.reserved_quantity = product.stock_quantity
        product.save(update_fields=["stock_quantity", "reserved_quantity", "updated_at"])
        return Response(ProductSerializer(product).data, status=status.HTTP_200_OK)


class PlaceOrderAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCustomer]

    def _get_bridge_vendor(self):
        bridge_user, _ = User.objects.get_or_create(
            email="catalog-bridge@onlinedukan.local",
            defaults={
                "name": "Catalog Bridge Vendor",
                "role": User.ROLE_VENDOR,
                "is_active": True,
            },
        )
        if bridge_user.role != User.ROLE_VENDOR:
            bridge_user.role = User.ROLE_VENDOR
            bridge_user.save(update_fields=["role"])

        bridge_vendor, _ = Vendor.objects.get_or_create(
            user=bridge_user,
            defaults={
                "business_name": "Catalog Bridge",
                "login_email": "catalog-bridge-login@onlinedukan.local",
            },
        )
        return bridge_vendor

    def post(self, request):
        serializer = PlaceOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data
        items_data = validated["items"]

        requested_by_product = {}
        for item in items_data:
            product_id = item["productId"]
            requested_by_product[product_id] = requested_by_product.get(product_id, 0) + item["quantity"]

        product_ids = list(requested_by_product.keys())
        item_map = {item["productId"]: item for item in items_data}

        with transaction.atomic():
            products = (
                Product.objects.select_for_update()
                .select_related("vendor")
                .filter(id__in=product_ids, is_active=True)
            )
            product_map = {product.id: product for product in products}

            missing = [pid for pid in product_ids if pid not in product_map]
            if missing:
                bridge_vendor = self._get_bridge_vendor()
                for missing_id in missing:
                    item_payload = item_map.get(missing_id, {})
                    fallback_title = str(item_payload.get("title", "")).strip() or f"Catalog Product {missing_id}"
                    fallback_price = item_payload.get("price")
                    if fallback_price is None:
                        fallback_price = Decimal("999.00")

                    fallback_product, _ = Product.objects.get_or_create(
                        sku=f"legacy-{missing_id}",
                        defaults={
                            "vendor": bridge_vendor,
                            "name": fallback_title[:200],
                            "description": "Auto-bridged product from legacy frontend catalog.",
                            "price": fallback_price,
                            "stock_quantity": 100000,
                            "reserved_quantity": 0,
                            "is_active": True,
                        },
                    )
                    if not fallback_product.is_active:
                        fallback_product.is_active = True
                        fallback_product.save(update_fields=["is_active", "updated_at"])
                    product_map[missing_id] = fallback_product

            subtotal = Decimal("0.00")
            order_lines = []

            for product_id, quantity in requested_by_product.items():
                product = product_map[product_id]
                if product.available_quantity < quantity:
                    return Response(
                        {
                            "detail": f"Insufficient stock for product '{product.name}'.",
                            "productId": product.id,
                            "available": product.available_quantity,
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                line_total = product.price * quantity
                subtotal += line_total
                item_payload = item_map.get(product_id, {})
                line_image = str(item_payload.get("image", "")).strip()
                order_lines.append((product, quantity, product.price, line_total, line_image))

            order = Order.objects.create(
                customer=request.user,
                status=Order.STATUS_PENDING,
                subtotal_amount=subtotal,
                shipping_amount=Decimal("0.00"),
                total_amount=subtotal,
                shipping_full_name=validated["fullName"],
                shipping_phone=validated["phone"],
                shipping_email=validated["email"],
                shipping_address=validated["address"],
                shipping_city=validated["city"],
                shipping_state=validated["state"],
                shipping_pincode=validated["pincode"],
            )
            OrderShippingDetail.objects.update_or_create(
                order=order,
                defaults={
                    "full_name": validated["fullName"],
                    "phone": validated["phone"],
                    "email": validated["email"],
                    "address": validated["address"],
                    "city": validated["city"],
                    "state": validated["state"],
                    "pincode": validated["pincode"],
                },
            )

            for product, quantity, unit_price, line_total, line_image in order_lines:
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    vendor=product.vendor,
                    quantity=quantity,
                    unit_price=unit_price,
                    line_total=line_total,
                    product_name=product.name,
                    product_image_url=line_image,
                )
                product.stock_quantity -= quantity
                product.save(update_fields=["stock_quantity", "updated_at"])

        order = Order.objects.select_related("shipping_detail").prefetch_related("items__product", "items__vendor").get(id=order.id)
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class MyOrdersAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCustomer]

    def get(self, request):
        orders = (
            Order.objects.filter(customer=request.user)
            .select_related("shipping_detail")
            .prefetch_related("items__product", "items__vendor")
            .order_by("-placed_at")
        )
        return Response(OrderSerializer(orders, many=True).data, status=status.HTTP_200_OK)


class MyOrderDetailAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCustomer]

    def get(self, request, order_id):
        order = (
            Order.objects.filter(id=order_id, customer=request.user)
            .select_related("shipping_detail")
            .prefetch_related("items__product", "items__vendor")
            .first()
        )
        if not order:
            return Response({"detail": "Order not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)


class CancelOrderAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCustomer]

    def post(self, request, order_id):
        order = Order.objects.filter(id=order_id, customer=request.user).first()
        if not order:
            return Response({"detail": "Order not found"}, status=status.HTTP_404_NOT_FOUND)
        if order.status in {Order.STATUS_DELIVERED, Order.STATUS_CANCELLED}:
            return Response({"detail": "Order cannot be cancelled now."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = CancelOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order.status = Order.STATUS_CANCELLED
        order.cancel_reason = serializer.validated_data["reason"].strip()
        order.cancelled_at = timezone.now()
        order.save(update_fields=["status", "cancel_reason", "cancelled_at", "updated_at"])

        return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)


@csrf_exempt
def google_auth(request):
    if request.method == "OPTIONS":
        return JsonResponse({"ok": True}, status=200)

    if request.method != "POST":
        return JsonResponse(
            {"ok": False, "error": "method_not_allowed", "allowed_methods": ["POST"]},
            status=405,
        )

    try:
        data = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"ok": False, "error": "invalid_json"}, status=400)

    code = str(data.get("code", "")).strip()
    code_verifier = str(data.get("code_verifier", "")).strip()
    redirect_uri_from_client = str(data.get("redirect_uri", "")).strip()
    if not code:
        return JsonResponse({"ok": False, "error": "missing_code"}, status=400)

    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET or not settings.GOOGLE_REDIRECT_URI:
        return JsonResponse({"ok": False, "error": "google_oauth_not_configured"}, status=500)

    # Popup auth-code flows from Google Identity Services commonly issue codes
    # bound to "postmessage". If frontend sends a redirect_uri, trust it.
    if redirect_uri_from_client:
        redirect_uri = redirect_uri_from_client
    elif code_verifier:
        redirect_uri = settings.GOOGLE_REDIRECT_URI
    else:
        redirect_uri = "postmessage"

    token_payload = {
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }
    if code_verifier:
        token_payload["code_verifier"] = code_verifier

    try:
        token_resp = requests.post(
            "https://oauth2.googleapis.com/token",
            data=token_payload,
            timeout=10,
        )
    except requests.RequestException as exc:
        error_payload = {
            "error": "token exchange failed",
            "google_status": 0,
            "google_text": str(exc),
            "google_json": None,
            "redirect_uri_used": redirect_uri,
        }
        print("GOOGLE TOKEN EXCHANGE FAILED")
        print("GOOGLE ERROR PAYLOAD:", error_payload)
        return JsonResponse(error_payload, status=400)

    try:
        token_data = token_resp.json()
    except ValueError:
        token_data = {"raw": token_resp.text}

    if token_resp.status_code != 200:
        error_payload = {
            "error": "token exchange failed",
            "google_status": token_resp.status_code,
            "google_text": token_resp.text,
            "google_json": token_data,
            "redirect_uri_used": redirect_uri,
        }
        print("GOOGLE TOKEN EXCHANGE FAILED")
        print("GOOGLE ERROR PAYLOAD:", error_payload)
        return JsonResponse(error_payload, status=400)

    id_token = token_data.get("id_token")
    if not id_token:
        return JsonResponse({"ok": False, "error": "id_token_missing"}, status=400)

    try:
        tokeninfo_resp = requests.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": id_token},
            timeout=10,
        )
    except requests.RequestException:
        return JsonResponse({"ok": False, "error": "token_verification_failed"}, status=502)

    try:
        tokeninfo = tokeninfo_resp.json()
    except ValueError:
        tokeninfo = {"raw": tokeninfo_resp.text}

    if tokeninfo_resp.status_code != 200:
        return JsonResponse(
            {"ok": False, "error": "token_verification_failed", "details": tokeninfo},
            status=400,
        )

    if tokeninfo.get("aud") != settings.GOOGLE_CLIENT_ID:
        return JsonResponse({"ok": False, "error": "invalid_audience"}, status=400)

    email = str(tokeninfo.get("email", "")).strip().lower()
    if not email:
        return JsonResponse({"ok": False, "error": "email_missing"}, status=400)

    user = User.objects.filter(email__iexact=email, role=User.ROLE_CUSTOMER).first()
    if not user:
        return JsonResponse(
            {
                "ok": False,
                "error": "user_not_registered",
                "detail": "Google account is not registered. Please register first.",
            },
            status=403,
        )

    login(request, user)
    return JsonResponse(
        {
            "ok": True,
            "email": user.email,
            "created": False,
            "user": UserSerializer(user).data,
            "tokens": token_payload_for_user(user),
        },
        status=200,
    )
