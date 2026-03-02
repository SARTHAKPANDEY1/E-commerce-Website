from django.urls import path

from .views import (
    LoginAPIView,
    MeAPIView,
    RefreshAPIView,
    RequestRegistrationOTPAPIView,
    ResendRegistrationOTPAPIView,
    VerifyRegistrationOTPAPIView,
)

urlpatterns = [
    path("register/request-otp/", RequestRegistrationOTPAPIView.as_view(), name="register_request_otp"),
    path("register/verify-otp/", VerifyRegistrationOTPAPIView.as_view(), name="register_verify_otp"),
    path("register/resend-otp/", ResendRegistrationOTPAPIView.as_view(), name="register_resend_otp"),
    path("login/", LoginAPIView.as_view(), name="login"),
    path("refresh/", RefreshAPIView.as_view(), name="token_refresh"),
    path("me/", MeAPIView.as_view(), name="me"),
]
