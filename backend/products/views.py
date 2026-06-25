from django.core.paginator import Paginator

from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Product, Category
from .serializers import ProductSerializer, CategorySerializer


@api_view(['GET'])
def product_list(request):
    products = Product.objects.filter(is_active=True)

    # Search by product name
    search = request.GET.get('search')
    if search:
        products = products.filter(
            name__icontains=search
        )

    # Filter by category slug
    category = request.GET.get('category')
    if category:
        products = products.filter(
            category__slug=category
        )

    # Filter by size
    size = request.GET.get('size')
    if size:
        products = products.filter(
            size=size
        )

    # Filter by minimum price
    min_price = request.GET.get('min_price')
    if min_price:
        products = products.filter(
            price__gte=min_price
        )

    # Filter by maximum price
    max_price = request.GET.get('max_price')
    if max_price:
        products = products.filter(
            price__lte=max_price
        )

    # Sorting
    sort = request.GET.get('sort')

    if sort == 'price_asc':
        products = products.order_by('price')

    elif sort == 'price_desc':
        products = products.order_by('-price')

    elif sort == 'newest':
        products = products.order_by('-created_at')

    # Pagination
    page = request.GET.get('page', 1)

    paginator = Paginator(products, 12)

    page_obj = paginator.get_page(page)

    serializer = ProductSerializer(
        page_obj,
        many=True
    )

    return Response({
        'count': paginator.count,
        'total_pages': paginator.num_pages,
        'current_page': page_obj.number,
        'results': serializer.data
    })


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