import re
from unittest.mock import Mock, patch

from django.core import mail
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Order, OrderShippingDetail, Product, User, Vendor


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

    def test_vendor_product_crud_and_stock_update(self):
        vendor_user = User.objects.create_user(
            email="vendor-auth@example.com",
            password="secret123",
            role=User.ROLE_VENDOR,
            name="Vendor Auth",
        )
        vendor_profile = Vendor.objects.create(
            user=vendor_user,
            business_name="Vendor Store",
            login_email="vendor-login@example.com",
        )

        self.client.force_authenticate(user=vendor_user)

        create_payload = {
            "name": "Test Product",
            "description": "Sample description",
            "price": "499.00",
            "sku": "SKU-TEST-001",
            "stock_quantity": 10,
            "reserved_quantity": 0,
            "is_active": True,
        }
        create_response = self.client.post(reverse("vendor_products"), create_payload, format="json")
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        product_id = create_response.data["id"]
        self.assertEqual(create_response.data["vendorId"], vendor_profile.id)

        list_response = self.client.get(reverse("vendor_products"))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 1)

        update_response = self.client.patch(
            reverse("vendor_product_stock_update", kwargs={"product_id": product_id}),
            {"stock_quantity": 7},
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data["stock_quantity"], 7)

        detail_response = self.client.get(reverse("vendor_product_detail", kwargs={"product_id": product_id}))
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.data["sku"], "SKU-TEST-001")

    def test_customer_place_order_and_my_orders(self):
        customer = User.objects.create_user(
            email="buyer@example.com",
            password="secret123",
            role=User.ROLE_CUSTOMER,
            name="Buyer",
        )
        vendor_user = User.objects.create_user(
            email="seller-auth@example.com",
            password="secret123",
            role=User.ROLE_VENDOR,
            name="Seller",
        )
        vendor_profile = Vendor.objects.create(
            user=vendor_user,
            business_name="Seller Store",
            login_email="seller-login@example.com",
        )
        product = Product.objects.create(
            vendor=vendor_profile,
            name="Laptop Bag",
            description="Waterproof bag",
            price="1200.00",
            sku="BAG-001",
            stock_quantity=5,
            reserved_quantity=0,
            is_active=True,
        )

        self.client.force_authenticate(user=customer)
        place_response = self.client.post(
            reverse("place_order"),
            {
                "items": [{"productId": product.id, "quantity": 2, "title": "Laptop Bag", "price": "1200.00"}],
                "fullName": "Buyer One",
                "phone": "9876543210",
                "email": "buyer@example.com",
                "address": "Street 1",
                "city": "Mumbai",
                "state": "Maharashtra",
                "pincode": "400001",
            },
            format="json",
        )
        self.assertEqual(place_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(place_response.data["total_amount"], "2400.00")
        self.assertEqual(len(place_response.data["items"]), 1)
        self.assertGreaterEqual(len(mail.outbox), 1)
        self.assertTrue(mail.outbox[-1].attachments)
        self.assertTrue(str(mail.outbox[-1].attachments[0][0]).endswith(".pdf"))

        product.refresh_from_db()
        self.assertEqual(product.stock_quantity, 3)

        my_orders_response = self.client.get(reverse("my_orders"))
        self.assertEqual(my_orders_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(my_orders_response.data), 1)
        self.assertEqual(my_orders_response.data[0]["items"][0]["productId"], product.id)
        self.assertEqual(my_orders_response.data[0]["shippingFullName"], "Buyer One")
        self.assertTrue(OrderShippingDetail.objects.filter(order_id=place_response.data["id"]).exists())

        self.assertEqual(Order.objects.filter(customer=customer).count(), 1)

    def test_customer_can_cancel_order_with_reason(self):
        customer = User.objects.create_user(
            email="cancelbuyer@example.com",
            password="secret123",
            role=User.ROLE_CUSTOMER,
            name="Cancel Buyer",
        )
        order = Order.objects.create(
            customer=customer,
            status=Order.STATUS_PENDING,
            subtotal_amount="100.00",
            shipping_amount="0.00",
            total_amount="100.00",
            shipping_full_name="Cancel Buyer",
            shipping_phone="9876543210",
            shipping_email="cancelbuyer@example.com",
            shipping_address="Addr",
            shipping_city="City",
            shipping_state="State",
            shipping_pincode="400001",
        )

        self.client.force_authenticate(user=customer)
        response = self.client.post(
            reverse("cancel_order", kwargs={"order_id": order.id}),
            {"reason": "Changed my mind"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "cancelled")
        self.assertEqual(response.data["cancelReason"], "Changed my mind")

    def test_cancel_order_restores_stock(self):
        customer = User.objects.create_user(
            email="restock-buyer@example.com",
            password="secret123",
            role=User.ROLE_CUSTOMER,
            name="Restock Buyer",
        )
        vendor_user = User.objects.create_user(
            email="restock-vendor-auth@example.com",
            password="secret123",
            role=User.ROLE_VENDOR,
            name="Restock Vendor",
        )
        vendor_profile = Vendor.objects.create(
            user=vendor_user,
            business_name="Restock Store",
            login_email="restock-vendor@example.com",
        )
        product = Product.objects.create(
            vendor=vendor_profile,
            name="Shoes",
            description="Running shoes",
            price="1000.00",
            sku="RESTOCK-1",
            stock_quantity=10,
            reserved_quantity=0,
            is_active=True,
        )

        self.client.force_authenticate(user=customer)
        place_response = self.client.post(
            reverse("place_order"),
            {
                "items": [{"productId": product.id, "quantity": 2, "title": "Shoes", "price": "1000.00"}],
                "fullName": "Restock Buyer",
                "phone": "9999999999",
                "email": "restock-buyer@example.com",
                "address": "Address 1",
                "city": "Bhopal",
                "state": "MP",
                "pincode": "462001",
            },
            format="json",
        )
        self.assertEqual(place_response.status_code, status.HTTP_201_CREATED)
        product.refresh_from_db()
        self.assertEqual(product.stock_quantity, 8)

        cancel_response = self.client.post(
            reverse("cancel_order", kwargs={"order_id": place_response.data["id"]}),
            {"reason": "Need to change address"},
            format="json",
        )
        self.assertEqual(cancel_response.status_code, status.HTTP_200_OK)
        product.refresh_from_db()
        self.assertEqual(product.stock_quantity, 10)

    def test_vendor_order_list_and_status_actions(self):
        customer = User.objects.create_user(
            email="vendorflow-buyer@example.com",
            password="secret123",
            role=User.ROLE_CUSTOMER,
            name="Vendor Flow Buyer",
        )
        vendor_user = User.objects.create_user(
            email="vendorflow-auth@example.com",
            password="secret123",
            role=User.ROLE_VENDOR,
            name="Vendor Flow Seller",
        )
        vendor_profile = Vendor.objects.create(
            user=vendor_user,
            business_name="Vendor Flow Store",
            login_email="vendorflow@example.com",
        )
        product = Product.objects.create(
            vendor=vendor_profile,
            name="Watch",
            description="Smart watch",
            price="2500.00",
            sku="WATCH-1",
            stock_quantity=6,
            reserved_quantity=0,
            is_active=True,
        )

        self.client.force_authenticate(user=customer)
        place_response = self.client.post(
            reverse("place_order"),
            {
                "items": [{"productId": product.id, "quantity": 1, "title": "Watch", "price": "2500.00"}],
                "fullName": "Vendor Flow Buyer",
                "phone": "9999999999",
                "email": "vendorflow-buyer@example.com",
                "address": "Address 2",
                "city": "Bhopal",
                "state": "MP",
                "pincode": "462001",
            },
            format="json",
        )
        self.assertEqual(place_response.status_code, status.HTTP_201_CREATED)
        item_id = place_response.data["items"][0]["id"]

        self.client.force_authenticate(user=vendor_user)
        list_response = self.client.get(reverse("vendor_orders"))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]["vendorStatus"], "pending")

        accept_response = self.client.patch(
            reverse("vendor_order_item_status", kwargs={"item_id": item_id}),
            {"status": "accepted"},
            format="json",
        )
        self.assertEqual(accept_response.status_code, status.HTTP_200_OK)
        self.assertEqual(accept_response.data["vendorStatus"], "accepted")
        self.assertEqual(accept_response.data["orderStatus"], "confirmed")

        filtered_response = self.client.get(f"{reverse('vendor_orders')}?vendorStatus=accepted")
        self.assertEqual(filtered_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(filtered_response.data), 1)

        summary_response = self.client.get(reverse("vendor_orders_summary"))
        self.assertEqual(summary_response.status_code, status.HTTP_200_OK)
        self.assertEqual(summary_response.data["acceptedItems"], 1)

        ship_response = self.client.patch(
            reverse("vendor_order_item_status", kwargs={"item_id": item_id}),
            {"status": "shipped"},
            format="json",
        )
        self.assertEqual(ship_response.status_code, status.HTTP_200_OK)
        self.assertEqual(ship_response.data["vendorStatus"], "shipped")
        self.assertEqual(ship_response.data["orderStatus"], "shipped")

    def test_vendor_reject_restores_stock(self):
        customer = User.objects.create_user(
            email="vendorreject-buyer@example.com",
            password="secret123",
            role=User.ROLE_CUSTOMER,
            name="Vendor Reject Buyer",
        )
        vendor_user = User.objects.create_user(
            email="vendorreject-auth@example.com",
            password="secret123",
            role=User.ROLE_VENDOR,
            name="Vendor Reject Seller",
        )
        vendor_profile = Vendor.objects.create(
            user=vendor_user,
            business_name="Vendor Reject Store",
            login_email="vendorreject@example.com",
        )
        product = Product.objects.create(
            vendor=vendor_profile,
            name="Bag",
            description="Travel bag",
            price="1500.00",
            sku="BAG-RESTORE-1",
            stock_quantity=4,
            reserved_quantity=0,
            is_active=True,
        )

        self.client.force_authenticate(user=customer)
        place_response = self.client.post(
            reverse("place_order"),
            {
                "items": [{"productId": product.id, "quantity": 2, "title": "Bag", "price": "1500.00"}],
                "fullName": "Vendor Reject Buyer",
                "phone": "9999999999",
                "email": "vendorreject-buyer@example.com",
                "address": "Address 3",
                "city": "Bhopal",
                "state": "MP",
                "pincode": "462001",
            },
            format="json",
        )
        self.assertEqual(place_response.status_code, status.HTTP_201_CREATED)
        item_id = place_response.data["items"][0]["id"]
        product.refresh_from_db()
        self.assertEqual(product.stock_quantity, 2)

        self.client.force_authenticate(user=vendor_user)
        reject_response = self.client.patch(
            reverse("vendor_order_item_status", kwargs={"item_id": item_id}),
            {"status": "rejected", "reason": "Out of stock at warehouse"},
            format="json",
        )
        self.assertEqual(reject_response.status_code, status.HTTP_200_OK)
        self.assertEqual(reject_response.data["vendorStatus"], "rejected")
        self.assertEqual(reject_response.data["stockRestored"], True)
        self.assertEqual(reject_response.data["orderStatus"], "cancelled")
        product.refresh_from_db()
        self.assertEqual(product.stock_quantity, 4)

    def test_invalid_vendor_status_transition_is_blocked(self):
        customer = User.objects.create_user(
            email="vendorinvalid-buyer@example.com",
            password="secret123",
            role=User.ROLE_CUSTOMER,
            name="Vendor Invalid Buyer",
        )
        vendor_user = User.objects.create_user(
            email="vendorinvalid-auth@example.com",
            password="secret123",
            role=User.ROLE_VENDOR,
            name="Vendor Invalid Seller",
        )
        vendor_profile = Vendor.objects.create(
            user=vendor_user,
            business_name="Vendor Invalid Store",
            login_email="vendorinvalid@example.com",
        )
        product = Product.objects.create(
            vendor=vendor_profile,
            name="Bottle",
            description="Steel bottle",
            price="500.00",
            sku="BOTTLE-1",
            stock_quantity=10,
            reserved_quantity=0,
            is_active=True,
        )

        self.client.force_authenticate(user=customer)
        place_response = self.client.post(
            reverse("place_order"),
            {
                "items": [{"productId": product.id, "quantity": 1, "title": "Bottle", "price": "500.00"}],
                "fullName": "Vendor Invalid Buyer",
                "phone": "9999999999",
                "email": "vendorinvalid-buyer@example.com",
                "address": "Address 4",
                "city": "Bhopal",
                "state": "MP",
                "pincode": "462001",
            },
            format="json",
        )
        item_id = place_response.data["items"][0]["id"]

        self.client.force_authenticate(user=vendor_user)
        invalid_transition = self.client.patch(
            reverse("vendor_order_item_status", kwargs={"item_id": item_id}),
            {"status": "shipped"},
            format="json",
        )
        self.assertEqual(invalid_transition.status_code, status.HTTP_400_BAD_REQUEST)
