from django.urls import path

from .views import (
    login,
    logout,
    me,
    signup,
)


urlpatterns = [
    path(
        "signup/",
        signup,
        name="signup",
    ),
    path(
        "login/",
        login,
        name="login",
    ),
    path(
        "me/",
        me,
        name="me",
    ),
    path(
        "logout/",
        logout,
        name="logout",
    ),
]