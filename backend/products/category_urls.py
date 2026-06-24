from django.urls import path
from .views import (
    category_list,
    category_detail,
    category_products,
)

urlpatterns = [
    path('', category_list, name='category-list'),
    path('<slug:slug>/', category_detail, name='category-detail'),
    path(
        '<slug:slug>/products/',
        category_products,
        name='category-products'
    ),
]