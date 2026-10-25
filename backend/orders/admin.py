
from django.contrib import admin

from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    can_delete = False

    fields = (
        "product_name",
        "unit_price",
        "quantity",
        "selected_size",
        "line_total_display",
    )

    readonly_fields = (
        "product_name",
        "unit_price",
        "quantity",
        "selected_size",
        "line_total_display",
    )

    def line_total_display(self, obj):
        if not obj or obj.pk is None:
            return "—"
        return f"₦{obj.line_total:,.2f}"

    line_total_display.short_description = "Line total"


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "customer_name",
        "total_amount",
        "payment_status",
        "order_status",
        "delivery_method",
        "created_at",
    )

    list_filter = (
        "payment_status",
        "order_status",
        "delivery_method",
        "created_at",
    )

    search_fields = (
        "customer_name",
        "customer_email",
        "customer_phone",
        "id",
        "payment_reference",
        "items__product_name",
    )

    readonly_fields = (
        "id",
        "recovery_token",
        "cart",
        "user",
        "customer_name",
        "customer_email",
        "customer_phone",
        "total_amount",
        "payment_reference",
        "payment_status",
        "created_at",
    )

    fields = (
        "id",
        "recovery_token",
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
    )

    inlines = (OrderItemInline,)
    ordering = ("-created_at",)
