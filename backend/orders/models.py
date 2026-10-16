import uuid

from django.contrib.auth.models import User
from django.db import models

from cart.models import Cart
from products.models import Product


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
        ("BOLT", "Bolt"),
        ("STORE_PICKUP", "Store Pickup"),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    cart = models.OneToOneField(
        Cart,
        on_delete=models.CASCADE,
    )

    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
    )

    customer_name = models.CharField(max_length=255)
    customer_email = models.EmailField()
    customer_phone = models.CharField(max_length=20)

    total_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
    )

    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS,
        default="PENDING",
    )

    payment_reference = models.CharField(
        max_length=255,
        unique=True,
        blank=True,
        null=True,
    )

    order_status = models.CharField(
        max_length=20,
        choices=ORDER_STATUS,
        default="PENDING",
    )

    delivery_method = models.CharField(
        max_length=20,
        choices=DELIVERY_METHOD,
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Order {self.id}"


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items",
    )

    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_items",
    )

    product_name = models.CharField(max_length=255)

    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )

    quantity = models.PositiveIntegerField()

    selected_size = models.CharField(
        max_length=20,
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def line_total(self):
        return self.unit_price * self.quantity

    def __str__(self):
        return f"{self.product_name} x {self.quantity}"