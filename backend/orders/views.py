
from decimal import Decimal
import uuid

import requests

from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from cart.models import Cart
from .models import Order
from .serializers import OrderSerializer


PAYSTACK_INITIALIZE_URL = (
    "https://api.paystack.co/transaction/initialize"
)
PAYSTACK_VERIFY_URL = (
    "https://api.paystack.co/transaction/verify/"
)


@api_view(["POST"])
@permission_classes([AllowAny])
def create_order(request):
    cart_id = request.data.get("cart_id")
    customer_name = request.data.get("customer_name", "")
    customer_email = request.data.get("customer_email", "")
    customer_phone = request.data.get("customer_phone", "")

    if not cart_id:
        return Response({"error": "Cart ID is required."}, status=400)

    if not isinstance(customer_name, str) or not customer_name.strip():
        return Response({"error": "Full name is required."}, status=400)

    if not isinstance(customer_email, str) or not customer_email.strip():
        return Response({"error": "Email is required."}, status=400)

    if not isinstance(customer_phone, str) or not customer_phone.strip():
        return Response({"error": "Phone number is required."}, status=400)

    customer_name = customer_name.strip()
    customer_email = customer_email.strip().lower()
    customer_phone = customer_phone.strip()

    try:
        cart = Cart.objects.get(id=cart_id)
    except (Cart.DoesNotExist, ValueError, TypeError):
        return Response({"error": "Cart not found."}, status=404)

    items = list(cart.items.select_related("product").all())

    if not items:
        return Response({"error": "Your cart is empty."}, status=400)

    total_amount = Decimal("0.00")

    for item in items:
        if item.quantity < 1 or not item.product.is_active:
            return Response(
                {"error": "A product in your cart is unavailable."},
                status=400,
            )

        if item.quantity > item.product.stock:
            return Response(
                {
                    "error": (
                        f"Insufficient stock for {item.product.name}. "
                        "Please update your cart."
                    )
                },
                status=400,
            )

        total_amount += item.product.price * item.quantity

    existing_order = Order.objects.filter(cart=cart).first()

    if existing_order:
        if existing_order.payment_status == "PAID":
            return Response(
                {"error": "This cart has already been paid for."},
                status=400,
            )

        existing_order.customer_name = customer_name
        existing_order.customer_email = customer_email
        existing_order.customer_phone = customer_phone
        existing_order.total_amount = total_amount
        existing_order.save(
            update_fields=[
                "customer_name",
                "customer_email",
                "customer_phone",
                "total_amount",
            ]
        )

        return Response(OrderSerializer(existing_order).data, status=200)

    order = Order.objects.create(
        cart=cart,
        user=None,
        customer_name=customer_name,
        customer_email=customer_email,
        customer_phone=customer_phone,
        total_amount=total_amount,
    )

    return Response(OrderSerializer(order).data, status=201)


@api_view(["POST"])
@permission_classes([AllowAny])
def initialize_payment(request):
    order_id = request.data.get("order_id")
    callback_url = request.data.get("callback_url")

    if not order_id:
        return Response({"error": "Order ID is required."}, status=400)

    try:
        order = Order.objects.get(id=order_id)
    except (Order.DoesNotExist, ValueError, TypeError):
        return Response({"error": "Order not found."}, status=404)

    if order.payment_status == "PAID":
        return Response(
            {"error": "This order has already been paid."},
            status=400,
        )

    if not order.customer_email or order.total_amount <= 0:
        return Response(
            {"error": "The order details are incomplete."},
            status=400,
        )

    if not settings.PAYSTACK_SECRET_KEY:
        return Response(
            {"error": "Paystack is not configured."},
            status=500,
        )

    amount_in_kobo = int(order.total_amount * 100)
    reference = f"{order.id}-{uuid.uuid4().hex[:12]}"

    payload = {
        "email": order.customer_email,
        "amount": amount_in_kobo,
        "currency": "NGN",
        "reference": reference,
        "metadata": {
            "order_id": str(order.id),
            "customer_name": order.customer_name,
            "customer_phone": order.customer_phone,
        },
    }

    if callback_url:
        payload["callback_url"] = callback_url

    headers = {
        "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
        "Content-Type": "application/json",
    }

    try:
        response = requests.post(
            PAYSTACK_INITIALIZE_URL,
            json=payload,
            headers=headers,
            timeout=30,
        )
        response_data = response.json()
    except (requests.RequestException, ValueError):
        return Response(
            {"error": "Unable to initialize payment with Paystack."},
            status=502,
        )

    if not response.ok or not response_data.get("status"):
        return Response(
            {
                "error": response_data.get(
                    "message",
                    "Paystack payment initialization failed.",
                )
            },
            status=502,
        )

    paystack_data = response_data.get("data", {})
    paystack_reference = paystack_data.get("reference")
    authorization_url = paystack_data.get("authorization_url")

    if not paystack_reference or not authorization_url:
        return Response(
            {"error": "Paystack returned an incomplete response."},
            status=502,
        )

    order.payment_reference = paystack_reference
    order.save(update_fields=["payment_reference"])

    return Response(
        {
            "order_id": str(order.id),
            "payment_reference": paystack_reference,
            "authorization_url": authorization_url,
            "access_code": paystack_data.get("access_code"),
        },
        status=200,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def verify_payment(request):
    order_id = request.data.get("order_id")
    reference = request.data.get("reference")

    if not order_id or not reference:
        return Response(
            {"error": "Order ID and payment reference are required."},
            status=400,
        )

    try:
        order = Order.objects.get(id=order_id)
    except (Order.DoesNotExist, ValueError, TypeError):
        return Response({"error": "Order not found."}, status=404)

    if not order.payment_reference or reference != order.payment_reference:
        return Response(
            {"error": "Payment reference does not match this order."},
            status=400,
        )

    if order.payment_status == "PAID":
        return Response(
            {
                "message": "Payment already verified.",
                "payment_status": "PAID",
                "order": OrderSerializer(order).data,
            },
            status=200,
        )

    if not settings.PAYSTACK_SECRET_KEY:
        return Response(
            {"error": "Paystack is not configured."},
            status=500,
        )

    headers = {
        "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
        "Content-Type": "application/json",
    }

    try:
        response = requests.get(
            f"{PAYSTACK_VERIFY_URL}{reference}",
            headers=headers,
            timeout=30,
        )
        response_data = response.json()
    except (requests.RequestException, ValueError):
        return Response(
            {"error": "Unable to verify payment with Paystack."},
            status=502,
        )

    if not response.ok or not response_data.get("status"):
        return Response(
            {
                "error": response_data.get(
                    "message",
                    "Payment verification failed.",
                )
            },
            status=502,
        )

    payment_data = response_data.get("data", {})

    if payment_data.get("reference") != order.payment_reference:
        return Response(
            {"error": "Payment reference mismatch."},
            status=400,
        )

    expected_amount = int(order.total_amount * 100)

    if payment_data.get("amount") != expected_amount:
        return Response(
            {"error": "Payment amount does not match the order."},
            status=400,
        )

    if payment_data.get("currency") != "NGN":
        return Response(
            {"error": "Payment currency does not match the order."},
            status=400,
        )

    if payment_data.get("status") != "success":
        return Response(
            {
                "message": "Payment has not been completed.",
                "payment_status": "PENDING",
                "paystack_status": payment_data.get("status"),
            },
            status=200,
        )

    order.payment_status = "PAID"
    order.save(update_fields=["payment_status"])

    return Response(
        {
            "message": "Payment verified successfully.",
            "payment_status": "PAID",
            "order": OrderSerializer(order).data,
        },
        status=200,
    )
