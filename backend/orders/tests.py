
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
                "metadata": {
                    "order_id": str(order_id),
                },
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
        self.assertEqual(
            order.customer_email,
            "customer@example.com",
        )
        self.assertEqual(order.total_amount, Decimal("50000.00"))
        self.assertEqual(order.payment_status, "PENDING")

        self.assertEqual(item.product_name, "Test Black Set")
        self.assertEqual(item.unit_price, Decimal("25000.00"))
        self.assertEqual(item.quantity, 2)
        self.assertEqual(item.selected_size, "L")

        self.assertEqual(len(response.data["items"]), 1)
        self.assertEqual(
            response.data["items"][0]["product_name"],
            "Test Black Set",
        )
        self.assertIn("payment_reference", response.data)

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
        self.assertEqual(
            Order.objects.filter(cart=self.cart).count(),
            1,
        )

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
                "order_id": str(order.id),
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
    @patch("orders.views.requests.get")
    def test_successful_mocked_verification_marks_order_paid(
        self,
        mock_get,
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
                "order_id": str(order.id),
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

        order.refresh_from_db()
        self.assertEqual(order.payment_status, "PAID")
        mock_get.assert_called_once()

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
                "order_id": str(order.id),
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
                "order_id": str(order.id),
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
        self,
        mock_get,
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
                "order_id": str(order.id),
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
        self,
        mock_get,
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
                "order_id": str(order.id),
                "reference": reference,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["payment_status"], "PENDING")

        order.refresh_from_db()
        self.assertEqual(order.payment_status, "PENDING")

    def test_delivery_method_requires_verified_payment(self):
        order = self.create_order()
        reference = "delivery-test-reference"
        self.set_payment_reference(order, reference)

        response = self.client.post(
            "/api/orders/set-delivery-method/",
            {
                "order_id": str(order.id),
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
                "order_id": str(order.id),
                "reference": "paid-delivery-reference",
                "delivery_method": "STORE_PICKUP",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        order.refresh_from_db()
        self.assertEqual(order.delivery_method, "STORE_PICKUP")

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
                "order_id": str(order.id),
                "reference": "invalid-delivery-reference",
                "delivery_method": "UBER",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)

        order.refresh_from_db()
        self.assertIsNone(order.delivery_method)
