from django.urls import path

from .views import (
    create_order,
    initialize_payment,
    verify_payment,
)


urlpatterns = [
    path(
        "create/",
        create_order,
        name="create-order",
    ),
    path(
        "initialize-payment/",
        initialize_payment,
        name="initialize-payment",
    ),
    path(
        "verify-payment/",
        verify_payment,
        name="verify-payment",
    ),
]