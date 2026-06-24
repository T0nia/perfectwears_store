# perfectwears_store\backend\products\views.py
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Product, Category
from .serializers import ProductSerializer, CategorySerializer


@api_view(['GET'])
def product_list(request):
    products = Product.objects.filter(is_active=True)
    serializer = ProductSerializer(products, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def product_detail(request, slug):
    try:
        product = Product.objects.get(
            slug=slug,
            is_active=True
        )
    except Product.DoesNotExist:
        return Response(
            {'error': 'Product not found'},
            status=404
        )

    serializer = ProductSerializer(product)
    return Response(serializer.data)


@api_view(['GET'])
def category_list(request):
    categories = Category.objects.all()

    data = []

    for category in categories:
        data.append({
            'id': category.id,
            'name': category.name,
            'slug': category.slug,
            'product_count': category.products.filter(
                is_active=True
            ).count()
        })

    return Response(data)


@api_view(['GET'])
def category_detail(request, slug):
    try:
        category = Category.objects.get(slug=slug)
    except Category.DoesNotExist:
        return Response(
            {'error': 'Category not found'},
            status=404
        )

    data = {
        'id': category.id,
        'name': category.name,
        'slug': category.slug,
        'product_count': category.products.filter(
            is_active=True
        ).count()
    }

    return Response(data)


@api_view(['GET'])
def category_products(request, slug):
    try:
        category = Category.objects.get(slug=slug)
    except Category.DoesNotExist:
        return Response(
            {'error': 'Category not found'},
            status=404
        )

    products = Product.objects.filter(
        category=category,
        is_active=True
    )

    serializer = ProductSerializer(
        products,
        many=True
    )

    return Response(serializer.data)