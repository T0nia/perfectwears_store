
from decimal import Decimal
import secrets
import uuid

import requests

from django.conf import settings
from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from cart.models import Cart
from .models import Order, OrderItem


PAYSTACK_INITIALIZE_URL = (
    "https://api.paystack.co/transaction/initialize"
)
PAYSTACK_VERIFY_URL = (
    "https://api.paystack.co/transaction/verify/"
)


def secrets_compare(provided, stored):
    """Compare recovery credentials without timing-sensitive equality."""
    return (
        isinstance(provided, str)
        and isinstance(stored, str)
        and bool(stored)
        and secrets.compare_digest(provided, stored)
    )


def create_order_item_snapshots(order, cart_items):
    """Save purchased product details independently of the live cart."""
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


def safe_order_data(order):
    """Return only the order details needed by the customer UI."""
    return {
        "id": str(order.id),
        "total_amount": str(order.total_amount),
        "payment_status": order.payment_status,
        "order_status": order.order_status,
        "payment_reference": order.payment_reference,
        "delivery_method": order.delivery_method,
        "created_at": order.created_at.isoformat(),
        "items": [
            {
                "id": item.id,
                "product": (
                    str(item.product_id) if item.product_id else None
                ),
                "product_name": item.product_name,
                "unit_price": str(item.unit_price),
                "quantity": item.quantity,
                "selected_size": item.selected_size,
                "line_total": str(item.line_total),
            }
            for item in order.items.all()
        ],
    }


def verify_paystack_order(order, reference):
    """
    Verify the order's existing transaction with Paystack.

    Returns (success, error_message, http_status).
    This function never initializes or charges a payment.
    """
    if (
        not order.payment_reference
        or not isinstance(reference, str)
        or reference != order.payment_reference
    ):
        return False, "Payment reference does not match this order.", 400

    if order.payment_status == "PAID":
        return True, None, 200

    if not settings.PAYSTACK_SECRET_KEY:
        return False, "Paystack is not configured.", 500

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
        return False, "Unable to verify payment with Paystack.", 502

    if not response.ok or not response_data.get("status"):
        return False, (
            response_data.get("message", "Payment verification failed.")
        ), 502

    payment_data = response_data.get("data", {})

    if not isinstance(payment_data, dict):
        return False, "Paystack returned invalid verification data.", 502

    if payment_data.get("reference") != order.payment_reference:
        return False, "Payment reference mismatch.", 400

    try:
        expected_amount = int(order.total_amount * 100)
    except (TypeError, ValueError, ArithmeticError):
        return False, "Order amount is invalid.", 400

    if payment_data.get("amount") != expected_amount:
        return False, "Payment amount does not match the order.", 400

    if payment_data.get("currency") != "NGN":
        return False, "Payment currency does not match the order.", 400

    if payment_data.get("status") != "success":
        return False, "Payment has not been completed.", 409

    verified_email = payment_data.get("email")
    metadata = payment_data.get("metadata")

    if (
        not isinstance(verified_email, str)
        or verified_email.strip().lower()
        != order.customer_email.strip().lower()
    ):
        return False, "Payment email does not match the order.", 400

    if (
        not isinstance(metadata, dict)
        or str(metadata.get("order_id", "")) != str(order.id)
    ):
        return False, "Payment metadata does not match the order.", 400

    with transaction.atomic():
        locked_order = Order.objects.select_for_update().get(id=order.id)

        if locked_order.payment_status != "PAID":
            if (
                locked_order.payment_reference != reference
                or int(locked_order.total_amount * 100) != expected_amount
                or locked_order.customer_email.strip().lower()
                != verified_email.strip().lower()
            ):
                return False, (
                    "Order details changed during verification."
                ), 400

            locked_order.payment_status = "PAID"
            locked_order.save(update_fields=["payment_status"])

    order.refresh_from_db()
    return True, None, 200


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
        cart_items = list(cart.items.select_related("product").all())

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

            # Do not alter an order while a Paystack transaction is
            # attached to it. Recover or verify that transaction first.
            if existing_order.payment_reference:
                return Response(
                    {
                        "error": (
                            "This order already has a payment reference. "
                            "Recover or verify the existing payment before "
                            "trying again. Do not create another payment."
                        ),
                        "order_id": str(existing_order.id),
                    },
                    status=409,
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

            create_order_item_snapshots(existing_order, cart_items)
            order = existing_order
            status_code = 200
        else:
            order = Order.objects.create(
                cart=cart,
                user=None,
                customer_name=customer_name,
                customer_email=customer_email,
                customer_phone=customer_phone,
                total_amount=total_amount,
            )
            create_order_item_snapshots(order, cart_items)
            status_code = 201

    return Response(
        {
            "id": str(order.id),
            "recovery_token": order.recovery_token,
            "total_amount": str(order.total_amount),
            "payment_status": order.payment_status,
        },
        status=status_code,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def initialize_payment(request):
    order_id = request.data.get("order_id")
    recovery_token = request.data.get("recovery_token")
    callback_url = request.data.get("callback_url")

    if not order_id or not recovery_token:
        return Response(
            {"error": "Order ID and recovery token are required."},
            status=400,
        )

    try:
        order = Order.objects.get(id=order_id)
    except (Order.DoesNotExist, ValueError, TypeError):
        return Response({"error": "Order not found."}, status=404)

    if not secrets_compare(recovery_token, order.recovery_token):
        return Response(
            {"error": "Order recovery details are invalid."},
            status=403,
        )

    if order.payment_status == "PAID":
        return Response(
            {"error": "This order has already been paid."},
            status=400,
        )

    if order.payment_reference:
        return Response(
            {
                "error": (
                    "A payment reference already exists for this order. "
                    "Recover or verify the existing payment instead. "
                    "Do not start another payment."
                ),
                "order_id": str(order.id),
            },
            status=409,
        )

    if not order.customer_email or order.total_amount <= 0:
        return Response(
            {"error": "The order details are incomplete."},
            status=400,
        )

    if not order.items.exists():
        return Response(
            {"error": "This order has no saved items."},
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

    if not isinstance(paystack_data, dict):
        return Response(
            {"error": "Paystack returned an invalid response."},
            status=502,
        )

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

    # Save only if another request has not attached a reference or paid
    # this order while Paystack initialization was in progress.
    with transaction.atomic():
        locked_order = Order.objects.select_for_update().get(id=order.id)

        if locked_order.payment_status == "PAID":
            return Response(
                {"error": "This order has already been paid."},
                status=409,
            )

        if locked_order.payment_reference:
            return Response(
                {
                    "error": (
                        "A payment reference was saved for this order. "
                        "Recover or verify that existing payment."
                    ),
                    "order_id": str(locked_order.id),
                },
                status=409,
            )

        locked_order.payment_reference = paystack_reference
        locked_order.save(update_fields=["payment_reference"])

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
    recovery_token = request.data.get("recovery_token")

    if not order_id or not reference or not recovery_token:
        return Response(
            {
                "error": (
                    "Order ID, payment reference and recovery token "
                    "are required."
                )
            },
            status=400,
        )

    try:
        order = Order.objects.get(id=order_id)
    except (Order.DoesNotExist, ValueError, TypeError):
        return Response({"error": "Order not found."}, status=404)

    if not secrets_compare(recovery_token, order.recovery_token):
        return Response(
            {"error": "Order recovery details are invalid."},
            status=403,
        )

    success, error, status_code = verify_paystack_order(order, reference)

    if not success:
        if status_code == 409:
            return Response(
                {
                    "message": error,
                    "payment_status": "PENDING",
                },
                status=200,
            )

        return Response({"error": error}, status=status_code)

    order.refresh_from_db()

    return Response(
        {
            "message": "Payment verified successfully.",
            "payment_status": "PAID",
            "order": safe_order_data(order),
        },
        status=200,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def recover_order(request):
    order_id = request.data.get("order_id")
    recovery_token = request.data.get("recovery_token")

    if not order_id or not recovery_token:
        return Response(
            {"error": "Order ID and recovery token are required."},
            status=400,
        )

    try:
        order = Order.objects.get(id=order_id)
    except (Order.DoesNotExist, ValueError, TypeError):
        return Response(
            {"error": "Order recovery details are invalid."},
            status=404,
        )

    if not secrets_compare(recovery_token, order.recovery_token):
        return Response(
            {"error": "Order recovery details are invalid."},
            status=403,
        )

    # An already-paid order can be returned safely. No new transaction
    # is created and Paystack is not contacted again.
    if order.payment_status == "PAID":
        return Response(
            {"order": safe_order_data(order)},
            status=200,
        )

    # Without a stored reference, there is no existing transaction to
    # verify. Never create one during recovery.
    if not order.payment_reference:
        return Response(
            {
                "error": (
                    "No payment reference is saved for this order. "
                    "Payment cannot yet be confirmed. Do not pay again; "
                    "retry shortly or contact support."
                ),
                "payment_status": order.payment_status,
            },
            status=409,
        )

    success, error, status_code = verify_paystack_order(
        order,
        order.payment_reference,
    )

    if not success:
        if status_code == 409:
            return Response(
                {
                    "message": (
                        "Paystack has not confirmed this payment yet. "
                        "Do not pay again; retry recovery shortly."
                    ),
                    "payment_status": "PENDING",
                },
                status=200,
            )

        return Response(
            {
                "error": error,
                "payment_status": order.payment_status,
            },
            status=status_code,
        )

    order.refresh_from_db()

    return Response(
        {"order": safe_order_data(order)},
        status=200,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def set_delivery_method(request):
    order_id = request.data.get("order_id")
    reference = request.data.get("reference")
    recovery_token = request.data.get("recovery_token")
    delivery_method = request.data.get("delivery_method")

    if not all((order_id, reference, recovery_token, delivery_method)):
        return Response(
            {
                "error": (
                    "Order ID, payment reference, recovery token and "
                    "delivery method are required."
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

            if not secrets_compare(recovery_token, order.recovery_token):
                return Response(
                    {"error": "Order recovery details are invalid."},
                    status=403,
                )

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
            "order": safe_order_data(order),
        },
        status=200,
    )
