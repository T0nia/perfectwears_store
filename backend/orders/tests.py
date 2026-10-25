
from decimal import Decimal
from unittest.mock import Mock, patch

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from cart.models import Cart, CartItem
from orders.models import Order, OrderItem
from products.models import Category, Product


class OrderFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.category = Category.objects.create(
            name="Two Piece Sets",
            slug="two-piece-sets",
        )

        self.product = Product.objects.create(
            name="Test Black Set",
            price=Decimal("25000.00"),
            category=self.category,
            image="",
            sizes="S,M,L",
            stock=10,
            is_active=True,
        )

        self.cart = Cart.objects.create()

        CartItem.objects.create(
            cart=self.cart,
            product=self.product,
            quantity=2,
            selected_size="L",
        )

        self.customer_details = {
            "cart_id": str(self.cart.id),
            "customer_name": "Test Customer",
            "customer_email": "customer@example.com",
            "customer_phone": "08012345678",
        }

    def create_order(self):
        response = self.client.post(
            "/api/orders/create/",
            self.customer_details,
            format="json",
        )
        self.assertIn(response.status_code, (200, 201))
        return Order.objects.get(cart=self.cart)

    def set_payment_reference(self, order, reference):
        order.payment_reference = reference
        order.save(update_fields=["payment_reference"])

    def order_credentials(self, order):
        return {
            "order_id": str(order.id),
            "recovery_token": order.recovery_token,
        }

    def mocked_verification_response(
        self,
        reference,
        *,
        amount=5000000,
        currency="NGN",
        status="success",
        email="customer@example.com",
        order_id=None,
    ):
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = {
            "status": True,
            "message": "Verification successful",
            "data": {
                "reference": reference,
                "amount": amount,
                "currency": currency,
                "status": status,
                "email": email,
                "metadata": {"order_id": str(order_id)},
            },
        }
        return mock_response

    def test_create_order_saves_item_snapshots_and_total(self):
        response = self.client.post(
            "/api/orders/create/",
            self.customer_details,
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        order = Order.objects.get(cart=self.cart)
        item = OrderItem.objects.get(order=order)

        self.assertEqual(order.customer_name, "Test Customer")
        self.assertEqual(order.customer_email, "customer@example.com")
        self.assertEqual(order.total_amount, Decimal("50000.00"))
        self.assertEqual(order.payment_status, "PENDING")
        self.assertEqual(item.product_name, "Test Black Set")
        self.assertEqual(item.unit_price, Decimal("25000.00"))
        self.assertEqual(item.quantity, 2)
        self.assertEqual(item.selected_size, "L")
        self.assertEqual(response.data["id"], str(order.id))
        self.assertEqual(
            response.data["recovery_token"],
            order.recovery_token,
        )
        self.assertNotIn("customer_email", response.data)

    def test_empty_cart_cannot_create_order(self):
        self.cart.items.all().delete()

        response = self.client.post(
            "/api/orders/create/",
            self.customer_details,
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.data)
        self.assertFalse(Order.objects.filter(cart=self.cart).exists())

    def test_inactive_product_cannot_be_ordered(self):
        self.product.is_active = False
        self.product.save()

        response = self.client.post(
            "/api/orders/create/",
            self.customer_details,
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Order.objects.filter(cart=self.cart).exists())

    def test_insufficient_stock_cannot_create_order(self):
        self.product.stock = 1
        self.product.save()

        response = self.client.post(
            "/api/orders/create/",
            self.customer_details,
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Order.objects.filter(cart=self.cart).exists())

    def test_paid_cart_cannot_create_another_order(self):
        order = self.create_order()
        order.payment_status = "PAID"
        order.payment_reference = "already-paid-reference"
        order.save(
            update_fields=["payment_status", "payment_reference"]
        )

        response = self.client.post(
            "/api/orders/create/",
            self.customer_details,
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Order.objects.filter(cart=self.cart).count(), 1)

    def test_cart_with_existing_payment_reference_is_not_rebuilt(self):
        order = self.create_order()
        reference = "existing-payment-reference"
        self.set_payment_reference(order, reference)

        response = self.client.post(
            "/api/orders/create/",
            self.customer_details,
            format="json",
        )

        self.assertEqual(response.status_code, 409)
        order.refresh_from_db()
        self.assertEqual(order.payment_reference, reference)
        self.assertEqual(order.total_amount, Decimal("50000.00"))

    @override_settings(PAYSTACK_SECRET_KEY="sk_test_mock")
    @patch("orders.views.requests.post")
    def test_initialize_payment_uses_mocked_paystack(self, mock_post):
        order = self.create_order()

        def mocked_initialize(*args, **kwargs):
            reference = kwargs["json"]["reference"]
            mock_response = Mock()
            mock_response.ok = True
            mock_response.json.return_value = {
                "status": True,
                "message": "Authorization URL created",
                "data": {
                    "reference": reference,
                    "authorization_url": (
                        "https://checkout.example.test/mock"
                    ),
                    "access_code": "mock-access-code",
                },
            }
            return mock_response

        mock_post.side_effect = mocked_initialize

        response = self.client.post(
            "/api/orders/initialize-payment/",
            {
                **self.order_credentials(order),
                "callback_url": (
                    "http://localhost:3000/payment/callback"
                ),
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["payment_reference"])
        self.assertEqual(
            response.data["authorization_url"],
            "https://checkout.example.test/mock",
        )

        order.refresh_from_db()
        self.assertEqual(
            order.payment_reference,
            response.data["payment_reference"],
        )
        self.assertEqual(order.payment_status, "PENDING")
        mock_post.assert_called_once()

    @override_settings(PAYSTACK_SECRET_KEY="sk_test_mock")
    @patch("orders.views.requests.post")
    def test_initialize_payment_rejects_missing_or_invalid_token(
        self, mock_post
    ):
        order = self.create_order()

        for payload in (
            {"order_id": str(order.id)},
            {
                "order_id": str(order.id),
                "recovery_token": "incorrect-token",
            },
        ):
            response = self.client.post(
                "/api/orders/initialize-payment/",
                payload,
                format="json",
            )
            self.assertIn(response.status_code, (400, 403))

        mock_post.assert_not_called()

    @override_settings(PAYSTACK_SECRET_KEY="sk_test_mock")
    @patch("orders.views.requests.post")
    def test_initialize_payment_rejects_existing_reference(
        self, mock_post
    ):
        order = self.create_order()
        self.set_payment_reference(order, "existing-reference")

        response = self.client.post(
            "/api/orders/initialize-payment/",
            self.order_credentials(order),
            format="json",
        )

        self.assertEqual(response.status_code, 409)
        mock_post.assert_not_called()

    @override_settings(PAYSTACK_SECRET_KEY="sk_test_mock")
    @patch("orders.views.requests.get")
    def test_successful_mocked_verification_marks_order_paid(
        self, mock_get
    ):
        order = self.create_order()
        reference = "mock-reference-456"
        self.set_payment_reference(order, reference)

        mock_get.return_value = self.mocked_verification_response(
            reference,
            order_id=order.id,
        )

        response = self.client.post(
            "/api/orders/verify-payment/",
            {
                **self.order_credentials(order),
                "reference": reference,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["payment_status"], "PAID")
        self.assertEqual(
            response.data["order"]["payment_reference"],
            reference,
        )
        self.assertNotIn("customer_email", response.data["order"])

        order.refresh_from_db()
        self.assertEqual(order.payment_status, "PAID")
        mock_get.assert_called_once()

    def test_verification_rejects_missing_or_invalid_token(self):
        order = self.create_order()
        reference = "token-required-reference"
        self.set_payment_reference(order, reference)

        for payload in (
            {"order_id": str(order.id), "reference": reference},
            {
                **self.order_credentials(order),
                "recovery_token": "incorrect-token",
                "reference": reference,
            },
        ):
            response = self.client.post(
                "/api/orders/verify-payment/",
                payload,
                format="json",
            )
            self.assertIn(response.status_code, (400, 403))

        order.refresh_from_db()
        self.assertEqual(order.payment_status, "PENDING")

    @override_settings(PAYSTACK_SECRET_KEY="sk_test_mock")
    @patch("orders.views.requests.get")
    def test_wrong_amount_does_not_mark_order_paid(self, mock_get):
        order = self.create_order()
        reference = "mock-reference-wrong-amount"
        self.set_payment_reference(order, reference)

        mock_get.return_value = self.mocked_verification_response(
            reference,
            amount=100,
            order_id=order.id,
        )

        response = self.client.post(
            "/api/orders/verify-payment/",
            {
                **self.order_credentials(order),
                "reference": reference,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, "PENDING")

    @override_settings(PAYSTACK_SECRET_KEY="sk_test_mock")
    @patch("orders.views.requests.get")
    def test_wrong_email_does_not_mark_order_paid(self, mock_get):
        order = self.create_order()
        reference = "mock-reference-wrong-email"
        self.set_payment_reference(order, reference)

        mock_get.return_value = self.mocked_verification_response(
            reference,
            email="someone-else@example.com",
            order_id=order.id,
        )

        response = self.client.post(
            "/api/orders/verify-payment/",
            {
                **self.order_credentials(order),
                "reference": reference,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data["error"].lower())

        order.refresh_from_db()
        self.assertEqual(order.payment_status, "PENDING")

    @override_settings(PAYSTACK_SECRET_KEY="sk_test_mock")
    @patch("orders.views.requests.get")
    def test_wrong_order_metadata_does_not_mark_order_paid(
        self, mock_get
    ):
        order = self.create_order()
        reference = "mock-reference-wrong-order"
        self.set_payment_reference(order, reference)

        mock_get.return_value = self.mocked_verification_response(
            reference,
            order_id="different-order-id",
        )

        response = self.client.post(
            "/api/orders/verify-payment/",
            {
                **self.order_credentials(order),
                "reference": reference,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("metadata", response.data["error"].lower())

        order.refresh_from_db()
        self.assertEqual(order.payment_status, "PENDING")

    @override_settings(PAYSTACK_SECRET_KEY="sk_test_mock")
    @patch("orders.views.requests.get")
    def test_pending_paystack_status_does_not_mark_order_paid(
        self, mock_get
    ):
        order = self.create_order()
        reference = "mock-reference-pending"
        self.set_payment_reference(order, reference)

        mock_get.return_value = self.mocked_verification_response(
            reference,
            status="pending",
            order_id=order.id,
        )

        response = self.client.post(
            "/api/orders/verify-payment/",
            {
                **self.order_credentials(order),
                "reference": reference,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["payment_status"], "PENDING")

        order.refresh_from_db()
        self.assertEqual(order.payment_status, "PENDING")

    def test_recover_paid_order_requires_valid_token(self):
        order = self.create_order()
        order.payment_status = "PAID"
        order.payment_reference = "recover-reference"
        order.save(
            update_fields=["payment_status", "payment_reference"]
        )

        response = self.client.post(
            "/api/orders/recover/",
            {"order_id": str(order.id), "recovery_token": "wrong-token"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

        response = self.client.post(
            "/api/orders/recover/",
            self.order_credentials(order),
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["order"]["id"], str(order.id))
        self.assertEqual(
            response.data["order"]["payment_status"],
            "PAID",
        )
        self.assertNotIn("customer_email", response.data["order"])

    def test_recover_pending_order_without_reference_does_not_claim_paid(
        self,
    ):
        order = self.create_order()

        response = self.client.post(
            "/api/orders/recover/",
            self.order_credentials(order),
            format="json",
        )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["payment_status"], "PENDING")
        order.refresh_from_db()
        self.assertEqual(order.payment_status, "PENDING")

    @override_settings(PAYSTACK_SECRET_KEY="sk_test_mock")
    @patch("orders.views.requests.get")
    def test_recover_pending_order_verifies_existing_successful_payment(
        self, mock_get
    ):
        order = self.create_order()
        reference = "existing-successful-payment"
        self.set_payment_reference(order, reference)

        mock_get.return_value = self.mocked_verification_response(
            reference,
            order_id=order.id,
        )

        response = self.client.post(
            "/api/orders/recover/",
            self.order_credentials(order),
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["order"]["payment_status"], "PAID")

        order.refresh_from_db()
        self.assertEqual(order.payment_status, "PAID")
        self.assertEqual(order.payment_reference, reference)
        mock_get.assert_called_once()

    @override_settings(PAYSTACK_SECRET_KEY="sk_test_mock")
    @patch("orders.views.requests.get")
    def test_recover_pending_existing_transaction_does_not_claim_paid(
        self, mock_get
    ):
        order = self.create_order()
        reference = "existing-pending-payment"
        self.set_payment_reference(order, reference)

        mock_get.return_value = self.mocked_verification_response(
            reference,
            status="pending",
            order_id=order.id,
        )

        response = self.client.post(
            "/api/orders/recover/",
            self.order_credentials(order),
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["payment_status"], "PENDING")

        order.refresh_from_db()
        self.assertEqual(order.payment_status, "PENDING")
        self.assertEqual(order.payment_reference, reference)
        mock_get.assert_called_once()

    def test_delivery_method_requires_verified_payment(self):
        order = self.create_order()
        reference = "delivery-test-reference"
        self.set_payment_reference(order, reference)

        response = self.client.post(
            "/api/orders/set-delivery-method/",
            {
                **self.order_credentials(order),
                "reference": reference,
                "delivery_method": "BOLT",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)

        order.refresh_from_db()
        self.assertIsNone(order.delivery_method)

    def test_paid_order_can_save_delivery_method(self):
        order = self.create_order()
        order.payment_reference = "paid-delivery-reference"
        order.payment_status = "PAID"
        order.save(
            update_fields=["payment_reference", "payment_status"]
        )

        response = self.client.post(
            "/api/orders/set-delivery-method/",
            {
                **self.order_credentials(order),
                "reference": "paid-delivery-reference",
                "delivery_method": "STORE_PICKUP",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        order.refresh_from_db()
        self.assertEqual(order.delivery_method, "STORE_PICKUP")

    def test_delivery_rejects_invalid_recovery_token(self):
        order = self.create_order()
        order.payment_reference = "delivery-token-reference"
        order.payment_status = "PAID"
        order.save(
            update_fields=["payment_reference", "payment_status"]
        )

        response = self.client.post(
            "/api/orders/set-delivery-method/",
            {
                "order_id": str(order.id),
                "recovery_token": "wrong-token",
                "reference": order.payment_reference,
                "delivery_method": "BOLT",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 403)

        order.refresh_from_db()
        self.assertIsNone(order.delivery_method)

    def test_invalid_delivery_method_is_rejected(self):
        order = self.create_order()
        order.payment_reference = "invalid-delivery-reference"
        order.payment_status = "PAID"
        order.save(
            update_fields=["payment_reference", "payment_status"]
        )

        response = self.client.post(
            "/api/orders/set-delivery-method/",
            {
                **self.order_credentials(order),
                "reference": order.payment_reference,
                "delivery_method": "UBER",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)

        order.refresh_from_db()
        self.assertIsNone(order.delivery_method)
