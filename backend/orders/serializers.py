from rest_framework import serializers

from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product",
            "product_name",
            "unit_price",
            "quantity",
            "selected_size",
            "line_total",
        ]
        read_only_fields = fields

    def get_line_total(self, obj):
        return str(obj.line_total)


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

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
        read_only_fields = fields