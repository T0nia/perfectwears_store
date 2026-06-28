from rest_framework import serializers

from .models import Order


class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = [
            "id",
            "cart",
            "customer_name",
            "customer_email",
            "customer_phone",
            "total_amount",
            "payment_status",
            "order_status",
            "delivery_method",
            "created_at",
        ]
        read_only_fields = [
            "payment_status",
            "order_status",
            "delivery_method",
            "created_at",
        ]