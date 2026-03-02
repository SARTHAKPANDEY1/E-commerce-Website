import re

from django.core import mail
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class AuthFlowTests(APITestCase):
    def _extract_otp(self):
        self.assertGreater(len(mail.outbox), 0)
        body = mail.outbox[-1].body
        match = re.search(r"(\d{6})", body)
        self.assertIsNotNone(match)
        return match.group(1)

    def test_request_verify_otp_then_login_me_refresh(self):
        request_payload = {
            "name": "Alice",
            "email": "alice@example.com",
            "password": "secret123",
            "role": "customer",
        }
        request_response = self.client.post(reverse("register_request_otp"), request_payload, format="json")
        self.assertEqual(request_response.status_code, status.HTTP_200_OK)
        self.assertEqual(request_response.data["detail"], "OTP sent to your email address.")
        self.assertIn("OnlineDukan Email Verification OTP", mail.outbox[-1].subject)

        otp = self._extract_otp()

        verify_response = self.client.post(
            reverse("register_verify_otp"),
            {"email": "alice@example.com", "otp": otp},
            format="json",
        )
        self.assertEqual(verify_response.status_code, status.HTTP_201_CREATED)
        self.assertIn("tokens", verify_response.data)
        self.assertEqual(verify_response.data["user"]["email"], "alice@example.com")

        login_payload = {
            "email": "alice@example.com",
            "password": "secret123",
            "role": "customer",
        }
        login_response = self.client.post(reverse("login"), login_payload, format="json")
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", login_response.data["tokens"])
        self.assertIn("refresh", login_response.data["tokens"])

        access_token = login_response.data["tokens"]["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        me_response = self.client.get(reverse("me"))
        self.assertEqual(me_response.status_code, status.HTTP_200_OK)
        self.assertEqual(me_response.data["email"], "alice@example.com")

        refresh_payload = {"refresh": login_response.data["tokens"]["refresh"]}
        refresh_response = self.client.post(reverse("token_refresh"), refresh_payload, format="json")
        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", refresh_response.data)

    def test_vendor_register_requires_organization_name(self):
        payload = {
            "name": "Vendor",
            "email": "vendor@example.com",
            "password": "secret123",
            "role": "vendor",
            "organizationName": "",
        }
        response = self.client.post(reverse("register_request_otp"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("organizationName", response.data)

    def test_login_fails_for_unregistered_user(self):
        payload = {
            "email": "missing@example.com",
            "password": "secret123",
            "role": "customer",
        }
        response = self.client.post(reverse("login"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"][0], "User not registered. Please register first.")

    def test_register_fails_for_duplicate_user(self):
        request_payload = {
            "name": "Duplicate User",
            "email": "dupe@example.com",
            "password": "secret123",
            "role": "customer",
        }
        first = self.client.post(reverse("register_request_otp"), request_payload, format="json")
        self.assertEqual(first.status_code, status.HTTP_200_OK)

        otp = self._extract_otp()
        verify = self.client.post(
            reverse("register_verify_otp"),
            {"email": request_payload["email"], "otp": otp},
            format="json",
        )
        self.assertEqual(verify.status_code, status.HTTP_201_CREATED)

        second = self.client.post(reverse("register_request_otp"), request_payload, format="json")
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(second.data["email"][0], "User already registered")

    def test_verify_otp_fails_for_invalid_otp(self):
        request_payload = {
            "name": "Otp Test",
            "email": "otp@example.com",
            "password": "secret123",
            "role": "customer",
        }
        req = self.client.post(reverse("register_request_otp"), request_payload, format="json")
        self.assertEqual(req.status_code, status.HTTP_200_OK)

        response = self.client.post(
            reverse("register_verify_otp"),
            {"email": "otp@example.com", "otp": "000000"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Invalid OTP")

    def test_resend_otp_endpoint(self):
        request_payload = {
            "name": "Resend User",
            "email": "resend@example.com",
            "password": "secret123",
            "role": "customer",
        }
        req = self.client.post(reverse("register_request_otp"), request_payload, format="json")
        self.assertEqual(req.status_code, status.HTTP_200_OK)

        # Force cooldown bypass by directly updating last sent time via second request not possible in same minute.
        # So this test verifies cooldown behavior.
        resend = self.client.post(reverse("register_resend_otp"), {"email": "resend@example.com"}, format="json")
        self.assertEqual(resend.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
