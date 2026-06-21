from django.contrib import admin
from .models import Product, Category


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "price",
        "category",
        "stock",
        "is_active",
        "created_at",
    )

    list_filter = (
        "is_active",
        "category",
        "created_at",
    )

    search_fields = (
        "name",
        "slug",
    )

    prepopulated_fields = {"slug": ("name",)}

    list_editable = (
        "price",
        "stock",
        "is_active",
    )

    ordering = ("-created_at",)