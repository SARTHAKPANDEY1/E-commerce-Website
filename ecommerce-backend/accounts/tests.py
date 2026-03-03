import re
from unittest.mock import Mock, patch

from django.core import mail
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import User


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
        self.assertIn("Onlineदुकान Email Verification OTP", mail.outbox[-1].subject)

        otp = self._extract_otp()

        verify_response = self.client.post(
            reverse("register_verify_otp"),
            {"email": "alice@example.com", "otp": otp, "role": "customer"},
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
        self.assertEqual(response.data["detail"][0], "Customer account not registered. Please register first.")

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
            {"email": request_payload["email"], "otp": otp, "role": "customer"},
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
            {"email": "otp@example.com", "otp": "000000", "role": "customer"},
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

    def test_same_email_can_register_for_customer_and_vendor(self):
        customer_payload = {
            "name": "Same Mail User",
            "email": "same@example.com",
            "password": "secret123",
            "role": "customer",
        }
        vendor_payload = {
            "name": "Same Mail Vendor",
            "email": "same@example.com",
            "password": "secret456",
            "role": "vendor",
            "organizationName": "SameMail Pvt Ltd",
        }

        customer_req = self.client.post(reverse("register_request_otp"), customer_payload, format="json")
        self.assertEqual(customer_req.status_code, status.HTTP_200_OK)
        customer_otp = self._extract_otp()
        customer_verify = self.client.post(
            reverse("register_verify_otp"),
            {"email": "same@example.com", "otp": customer_otp, "role": "customer"},
            format="json",
        )
        self.assertEqual(customer_verify.status_code, status.HTTP_201_CREATED)

        vendor_req = self.client.post(reverse("register_request_otp"), vendor_payload, format="json")
        self.assertEqual(vendor_req.status_code, status.HTTP_200_OK)
        vendor_otp = self._extract_otp()
        vendor_verify = self.client.post(
            reverse("register_verify_otp"),
            {"email": "same@example.com", "otp": vendor_otp, "role": "vendor"},
            format="json",
        )
        self.assertEqual(vendor_verify.status_code, status.HTTP_201_CREATED)

        customer_login = self.client.post(
            reverse("login"),
            {"email": "same@example.com", "password": "secret123", "role": "customer"},
            format="json",
        )
        self.assertEqual(customer_login.status_code, status.HTTP_200_OK)
        self.assertEqual(customer_login.data["user"]["role"], "customer")

        vendor_login = self.client.post(
            reverse("login"),
            {"email": "same@example.com", "password": "secret456", "role": "vendor"},
            format="json",
        )
        self.assertEqual(vendor_login.status_code, status.HTTP_200_OK)
        self.assertEqual(vendor_login.data["user"]["role"], "vendor")

    @override_settings(
        GOOGLE_CLIENT_ID="test-client-id",
        GOOGLE_CLIENT_SECRET="test-client-secret",
        GOOGLE_REDIRECT_URI="http://localhost:5173/auth/google/callback",
    )
    @patch("accounts.views.requests.get")
    @patch("accounts.views.requests.post")
    def test_google_login_fails_for_unregistered_user(self, mock_post, mock_get):
        mock_post.return_value = Mock(
            status_code=200,
            json=Mock(return_value={"id_token": "test-id-token"}),
            text='{"id_token":"test-id-token"}',
        )
        mock_get.return_value = Mock(
            status_code=200,
            json=Mock(
                return_value={
                    "aud": "test-client-id",
                    "email": "not-registered@example.com",
                }
            ),
            text='{"aud":"test-client-id","email":"not-registered@example.com"}',
        )

        response = self.client.post(
            reverse("google_auth"),
            {"code": "fake-auth-code"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.json()["error"], "user_not_registered")

    @override_settings(
        GOOGLE_CLIENT_ID="test-client-id",
        GOOGLE_CLIENT_SECRET="test-client-secret",
        GOOGLE_REDIRECT_URI="http://localhost:5173/auth/google/callback",
    )
    @patch("accounts.views.requests.get")
    @patch("accounts.views.requests.post")
    def test_google_login_succeeds_for_registered_user(self, mock_post, mock_get):
        User.objects.create_user(
            email="registered@example.com",
            password="secret123",
            role="customer",
            name="Registered User",
        )

        mock_post.return_value = Mock(
            status_code=200,
            json=Mock(return_value={"id_token": "test-id-token"}),
            text='{"id_token":"test-id-token"}',
        )
        mock_get.return_value = Mock(
            status_code=200,
            json=Mock(
                return_value={
                    "aud": "test-client-id",
                    "email": "registered@example.com",
                }
            ),
            text='{"aud":"test-client-id","email":"registered@example.com"}',
        )

        response = self.client.post(
            reverse("google_auth"),
            {"code": "fake-auth-code"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()["ok"])
