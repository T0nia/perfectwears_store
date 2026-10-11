
from rest_framework import serializers

from cart.serializers import CartItemSerializer
from .models import Order


class OrderSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "cart",
            "user",
            "customer_name",
            "customer_email",
            "customer_phone",
            "total_amount",
            "payment_reference",
            "payment_status",
            "order_status",
            "delivery_method",
            "created_at",
            "items",
        ]

        read_only_fields = [
            "id",
            "total_amount",
            "payment_reference",
            "payment_status",
            "order_status",
            "delivery_method",
            "created_at",
            "items",
        ]

    def get_items(self, obj):
        cart_items = obj.cart.items.select_related(
            "product",
            "product__category",
        ).all()

        return CartItemSerializer(
            cart_items,
            many=True,
            context=self.context,
        ).data
