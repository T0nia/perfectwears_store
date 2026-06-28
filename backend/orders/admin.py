from django.contrib import admin
from .models import Order


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "customer_name",
        "customer_email",
        "created_at",
    )

    search_fields = (
        "customer_name",
        "customer_email",
        "id",
    )

    readonly_fields = (
        "created_at",
    )

    ordering = (
        "-created_at",
    )