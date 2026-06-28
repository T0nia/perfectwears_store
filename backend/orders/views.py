from rest_framework.decorators import api_view
from rest_framework.response import Response

from cart.models import Cart
from .models import Order
from .serializers import OrderSerializer


@api_view(["POST"])
def create_order(request):
    cart_id = request.data.get("cart_id")
    customer_name = request.data.get("customer_name")
    customer_email = request.data.get("customer_email")

    # Required fields
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

    # Find cart
    try:
        cart = Cart.objects.get(id=cart_id)
    except Cart.DoesNotExist:
        return Response(
            {"error": "Cart not found"},
            status=404,
        )

    # Empty cart
    if cart.items.count() == 0:
        return Response(
            {"error": "Cart is empty"},
            status=400,
        )

    # Prevent duplicate orders
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

    # Create order
    order = Order.objects.create(
        cart=cart,
        customer_name=customer_name,
        customer_email=customer_email,
    )

    serializer = OrderSerializer(order)

    return Response(serializer.data, status=201)