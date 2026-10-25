
from django.urls import path

from .views import (
    create_order,
    initialize_payment,
    verify_payment,
    recover_order,
    set_delivery_method,
)

urlpatterns = [
    path("create/", create_order, name="create-order"),
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
    path("recover/", recover_order, name="recover-order"),
    path(
        "set-delivery-method/",
        set_delivery_method,
        name="set-delivery-method",
    ),
]
