from django.db import models
import uuid

from cart.models import Cart


class Order(models.Model):
    PAYMENT_STATUS = [
        ("PENDING", "Pending"),
        ("PAID", "Paid"),
    ]

    ORDER_STATUS = [
        ("PENDING", "Pending"),
        ("PROCESSING", "Processing"),
        ("COMPLETED", "Completed"),
        ("CANCELLED", "Cancelled"),
    ]

    DELIVERY_METHOD = [
        ("UBER", "Uber"),
        ("BOLT", "Bolt"),
        ("STORE_PICKUP", "Store Pickup"),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    cart = models.OneToOneField(
        Cart,
        on_delete=models.CASCADE
    )

    customer_name = models.CharField(
        max_length=255
    )

    customer_email = models.EmailField()

    customer_phone = models.CharField(
        max_length=20
    )

    total_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS,
        default="PENDING"
    )

    order_status = models.CharField(
        max_length=20,
        choices=ORDER_STATUS,
        default="PENDING"
    )

    delivery_method = models.CharField(
        max_length=20,
        choices=DELIVERY_METHOD,
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f"Order {self.id}"