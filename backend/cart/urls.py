from django.urls import path

from .views import (
    create_cart,
    cart_detail,
    add_to_cart,
    update_cart_item,
    remove_from_cart,
)

urlpatterns = [
    path(
        'create/',
        create_cart,
        name='create-cart'
    ),

    path(
        '<uuid:cart_id>/',
        cart_detail,
        name='cart-detail'
    ),

    path(
        'add-item/',
        add_to_cart,
        name='add-to-cart'
    ),

    path(
        'update-item/',
        update_cart_item,
        name='update-cart-item'
    ),

    path(
        'remove-item/',
        remove_from_cart,
        name='remove-from-cart'
    ),
]