
from decimal import Decimal
import uuid

import requests

from django.conf import settings
from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from cart.models import Cart
from .models import Order, OrderItem
from .serializers import OrderSerializer


PAYSTACK_INITIALIZE_URL = (
    "https://api.paystack.co/transaction/initialize"
)
PAYSTACK_VERIFY_URL = (
    "https://api.paystack.co/transaction/verify/"
)


def create_order_item_snapshots(order, cart_items):
    """
    Save purchased details independently of the live cart.
    Call only when creating or refreshing an unpaid order.
    """
    OrderItem.objects.filter(order=order).delete()

    snapshots = [
        OrderItem(
            order=order,
            product=item.product,
            product_name=item.product.name,
            unit_price=item.product.price,
            quantity=item.quantity,
            selected_size=item.selected_size,
        )
        for item in cart_items
    ]

    OrderItem.objects.bulk_create(snapshots)


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

    with transaction.atomic():
        cart_items = list(
            cart.items.select_related("product").all()
        )

        if not cart_items:
            return Response({"error": "Your cart is empty."}, status=400)

        total_amount = Decimal("0.00")

        for item in cart_items:
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

        existing_order = (
            Order.objects.select_for_update()
            .filter(cart=cart)
            .first()
        )

        if existing_order:
            if existing_order.payment_status == "PAID":
                return Response(
                    {
                        "error": (
                            "This cart has already been paid for. "
                            "Please start a new cart for another order."
                        )
                    },
                    status=400,
                )

            existing_order.customer_name = customer_name
            existing_order.customer_email = customer_email
            existing_order.customer_phone = customer_phone
            existing_order.total_amount = total_amount

            # Changing an unpaid order invalidates any earlier payment
            # reference so an old checkout cannot verify against it.
            existing_order.payment_reference = None
            existing_order.save(
                update_fields=[
                    "customer_name",
                    "customer_email",
                    "customer_phone",
                    "total_amount",
                    "payment_reference",
                ]
            )

            create_order_item_snapshots(existing_order, cart_items)

            return Response(
                OrderSerializer(existing_order).data,
                status=200,
            )

        order = Order.objects.create(
            cart=cart,
            user=None,
            customer_name=customer_name,
            customer_email=customer_email,
            customer_phone=customer_phone,
            total_amount=total_amount,
        )

        create_order_item_snapshots(order, cart_items)

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

    if not order.items.exists():
        return Response(
            {
                "error": (
                    "This order has no saved items. "
                    "Please return to your cart and create the order again."
                )
            },
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

    if paystack_reference != reference:
        return Response(
            {"error": "Paystack returned an unexpected payment reference."},
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

    if (
        not order.payment_reference
        or reference != order.payment_reference
    ):
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

    # Do not mark an order paid unless Paystack reports success.
    if payment_data.get("status") != "success":
        return Response(
            {
                "message": "Payment has not been completed.",
                "payment_status": "PENDING",
                "paystack_status": payment_data.get("status"),
            },
            status=200,
        )

    # Confirm the transaction is for the same customer and order.
    verified_email = payment_data.get("email")
    metadata = payment_data.get("metadata")

    if (
        not isinstance(verified_email, str)
        or verified_email.strip().lower() != order.customer_email.lower()
    ):
        return Response(
            {"error": "Payment email does not match the order."},
            status=400,
        )

    if (
        not isinstance(metadata, dict)
        or str(metadata.get("order_id", "")) != str(order.id)
    ):
        return Response(
            {"error": "Payment metadata does not match the order."},
            status=400,
        )

    with transaction.atomic():
        locked_order = Order.objects.select_for_update().get(id=order.id)

        if locked_order.payment_status != "PAID":
            # Re-check mutable order details after acquiring the lock.
            if (
                locked_order.payment_reference != reference
                or int(locked_order.total_amount * 100) != expected_amount
                or locked_order.customer_email.lower()
                != verified_email.strip().lower()
            ):
                return Response(
                    {"error": "Order details changed during verification."},
                    status=400,
                )

            locked_order.payment_status = "PAID"
            locked_order.save(update_fields=["payment_status"])

    order.refresh_from_db()

    return Response(
        {
            "message": "Payment verified successfully.",
            "payment_status": "PAID",
            "order": OrderSerializer(order).data,
        },
        status=200,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def set_delivery_method(request):
    order_id = request.data.get("order_id")
    reference = request.data.get("reference")
    delivery_method = request.data.get("delivery_method")

    if not order_id or not reference or not delivery_method:
        return Response(
            {
                "error": (
                    "Order ID, payment reference and delivery method "
                    "are required."
                )
            },
            status=400,
        )

    if delivery_method not in ("BOLT", "STORE_PICKUP"):
        return Response(
            {"error": "Choose either Bolt or Store Pickup."},
            status=400,
        )

    try:
        with transaction.atomic():
            order = Order.objects.select_for_update().get(id=order_id)

            if (
                not order.payment_reference
                or reference != order.payment_reference
            ):
                return Response(
                    {"error": "Payment reference does not match this order."},
                    status=400,
                )

            if order.payment_status != "PAID":
                return Response(
                    {
                        "error": (
                            "Payment must be verified before choosing "
                            "a delivery method."
                        )
                    },
                    status=400,
                )

            order.delivery_method = delivery_method
            order.save(update_fields=["delivery_method"])

    except (Order.DoesNotExist, ValueError, TypeError):
        return Response({"error": "Order not found."}, status=404)

    order.refresh_from_db()

    return Response(
        {
            "message": "Your delivery preference has been saved.",
            "order": OrderSerializer(order).data,
        },
        status=200,
    )
