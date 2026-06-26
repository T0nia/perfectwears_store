from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Cart, CartItem
from .serializers import CartSerializer
from products.models import Product


@api_view(['POST'])
def create_cart(request):
    cart = Cart.objects.create()

    serializer = CartSerializer(cart)

    return Response(
        serializer.data,
        status=201
    )


@api_view(['GET'])
def cart_detail(request, cart_id):
    try:
        cart = Cart.objects.get(id=cart_id)
    except Cart.DoesNotExist:
        return Response(
            {'error': 'Cart not found'},
            status=404
        )

    serializer = CartSerializer(cart)

    return Response(serializer.data)


@api_view(['POST'])
def add_to_cart(request):
    cart_id = request.data.get('cart_id')
    product_id = request.data.get('product_id')
    quantity = request.data.get('quantity', 1)
    selected_size = request.data.get('selected_size')

    try:
        cart = Cart.objects.get(id=cart_id)
    except Cart.DoesNotExist:
        return Response(
            {'error': 'Cart not found'},
            status=404
        )

    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response(
            {'error': 'Product not found'},
            status=404
        )

    cart_item, created = CartItem.objects.get_or_create(
        cart=cart,
        product=product,
        selected_size=selected_size,
        defaults={
            'quantity': quantity
        }
    )

    if not created:
        cart_item.quantity += int(quantity)
        cart_item.save()

    serializer = CartSerializer(cart)

    return Response(serializer.data)


@api_view(['PATCH'])
def update_cart_item(request):
    cart_item_id = request.data.get('cart_item_id')
    quantity = request.data.get('quantity')

    try:
        item = CartItem.objects.get(id=cart_item_id)
    except CartItem.DoesNotExist:
        return Response(
            {'error': 'Cart item not found'},
            status=404
        )

    item.quantity = quantity
    item.save()

    serializer = CartSerializer(item.cart)

    return Response(serializer.data)


@api_view(['POST'])
def remove_from_cart(request):
    cart_item_id = request.data.get('cart_item_id')

    try:
        item = CartItem.objects.get(id=cart_item_id)
    except CartItem.DoesNotExist:
        return Response(
            {'error': 'Cart item not found'},
            status=404
        )

    item.delete()

    return Response({
        'message': 'Item removed from cart'
    })