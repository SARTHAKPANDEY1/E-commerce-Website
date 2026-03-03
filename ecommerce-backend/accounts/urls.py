from django.urls import path

from .views import (
    LoginAPIView,
    CancelOrderAPIView,
    MeAPIView,
    MyOrderDetailAPIView,
    MyOrdersAPIView,
    PlaceOrderAPIView,
    RefreshAPIView,
    RequestRegistrationOTPAPIView,
    ResendRegistrationOTPAPIView,
    VendorProductDetailAPIView,
    VendorProductListCreateAPIView,
    VendorProductStockUpdateAPIView,
    VerifyRegistrationOTPAPIView,
    google_auth,
)

urlpatterns = [
    path("register/request-otp/", RequestRegistrationOTPAPIView.as_view(), name="register_request_otp"),
    path("register/verify-otp/", VerifyRegistrationOTPAPIView.as_view(), name="register_verify_otp"),
    path("register/resend-otp/", ResendRegistrationOTPAPIView.as_view(), name="register_resend_otp"),
    path("login/", LoginAPIView.as_view(), name="login"),
    path("google/", google_auth, name="google_auth"),
    path("google", google_auth, name="google_auth_no_slash"),
    path("orders/place/", PlaceOrderAPIView.as_view(), name="place_order"),
    path("orders/my/", MyOrdersAPIView.as_view(), name="my_orders"),
    path("orders/my/<int:order_id>/", MyOrderDetailAPIView.as_view(), name="my_order_detail"),
    path("orders/my/<int:order_id>/cancel/", CancelOrderAPIView.as_view(), name="cancel_order"),
    path("vendor/products/", VendorProductListCreateAPIView.as_view(), name="vendor_products"),
    path("vendor/products/<int:product_id>/", VendorProductDetailAPIView.as_view(), name="vendor_product_detail"),
    path("vendor/products/<int:product_id>/stock/", VendorProductStockUpdateAPIView.as_view(), name="vendor_product_stock_update"),
    path("refresh/", RefreshAPIView.as_view(), name="token_refresh"),
    path("me/", MeAPIView.as_view(), name="me"),
]
