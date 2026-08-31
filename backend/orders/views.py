from decimal import Decimal

import requests

from django.conf import settings

from rest_framework.decorators import api_view
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
def create_order(request):
    cart_id = request.data.get("cart_id")
    customer_name = request.data.get("customer_name")
    customer_email = request.data.get("customer_email")
    customer_phone = request.data.get("customer_phone")

    if not cart_id:
        return Response(
            {"error": "cart_id is required"},
            status=400,
        )

    if not customer_name:
        return Response(
            {"error": "customer_name is required"},
            status=400,
        )

    if not customer_email:
        return Response(
            {"error": "customer_email is required"},
            status=400,
        )

    if not customer_phone:
        return Response(
            {"error": "customer_phone is required"},
            status=400,
        )

    try:
        cart = Cart.objects.get(id=cart_id)
    except Cart.DoesNotExist:
        return Response(
            {"error": "Cart not found"},
            status=404,
        )

    if cart.items.count() == 0:
        return Response(
            {"error": "Cart is empty"},
            status=400,
        )

    existing_order = Order.objects.filter(cart=cart).first()

    if existing_order:
        serializer = OrderSerializer(existing_order)

        return Response(
            {
                "error": "This cart has already been checked out.",
                "order": serializer.data,
            },
            status=400,
        )

    total_amount = Decimal("0.00")

    for item in cart.items.all():
        total_amount += item.product.price * item.quantity

    order = Order.objects.create(
        cart=cart,
        customer_name=customer_name,
        customer_email=customer_email,
        customer_phone=customer_phone,
        total_amount=total_amount,
    )

    serializer = OrderSerializer(order)

    return Response(
        serializer.data,
        status=201,
    )


@api_view(["POST"])
def initialize_payment(request):
    order_id = request.data.get("order_id")

    if not order_id:
        return Response(
            {"error": "order_id is required"},
            status=400,
        )

    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return Response(
            {"error": "Order not found"},
            status=404,
        )

    if order.payment_status == "PAID":
        return Response(
            {"error": "This order has already been paid."},
            status=400,
        )

    if not settings.PAYSTACK_SECRET_KEY:
        return Response(
            {"error": "Paystack is not configured."},
            status=500,
        )

    amount_in_kobo = int(order.total_amount * 100)

    reference = str(order.id)

    headers = {
        "Authorization": (
            f"Bearer {settings.PAYSTACK_SECRET_KEY}"
        ),
        "Content-Type": "application/json",
    }

    payload = {
        "email": order.customer_email,
        "amount": str(amount_in_kobo),
        "currency": "NGN",
        "reference": reference,
        "metadata": {
            "order_id": str(order.id),
            "customer_name": order.customer_name,
            "customer_phone": order.customer_phone,
        },
    }

    try:
        response = requests.post(
            PAYSTACK_INITIALIZE_URL,
            json=payload,
            headers=headers,
            timeout=30,
        )

        response_data = response.json()

    except requests.RequestException:
        return Response(
            {
                "error": (
                    "Unable to connect to Paystack. "
                    "Please try again."
                )
            },
            status=502,
        )

    except ValueError:
        return Response(
            {"error": "Invalid response received from Paystack."},
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
    access_code = paystack_data.get("access_code")

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
            "access_code": access_code,
        },
        status=200,
    )


@api_view(["POST"])
def verify_payment(request):
    order_id = request.data.get("order_id")
    reference = request.data.get("reference")

    if not order_id:
        return Response(
            {"error": "order_id is required"},
            status=400,
        )

    if not reference:
        return Response(
            {"error": "reference is required"},
            status=400,
        )

    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return Response(
            {"error": "Order not found"},
            status=404,
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
        "Authorization": (
            f"Bearer {settings.PAYSTACK_SECRET_KEY}"
        ),
        "Content-Type": "application/json",
    }

    try:
        response = requests.get(
            f"{PAYSTACK_VERIFY_URL}{reference}",
            headers=headers,
            timeout=30,
        )

        response_data = response.json()

    except requests.RequestException:
        return Response(
            {
                "error": (
                    "Unable to connect to Paystack "
                    "for payment verification."
                )
            },
            status=502,
        )

    except ValueError:
        return Response(
            {"error": "Invalid response received from Paystack."},
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

    payment_status = payment_data.get("status")
    paystack_reference = payment_data.get("reference")
    paid_amount = payment_data.get("amount")

    expected_amount = int(order.total_amount * 100)

    if paystack_reference != reference:
        return Response(
            {"error": "Payment reference mismatch."},
            status=400,
        )

    if paystack_reference != order.payment_reference:
        return Response(
            {"error": "Payment reference does not match this order."},
            status=400,
        )

    if paid_amount != expected_amount:
        return Response(
            {"error": "Payment amount does not match the order amount."},
            status=400,
        )

    if payment_status != "success":
        return Response(
            {
                "message": "Payment has not been completed.",
                "payment_status": "PENDING",
                "paystack_status": payment_status,
                "order": OrderSerializer(order).data,
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