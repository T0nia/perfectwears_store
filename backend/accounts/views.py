from django.contrib.auth import authenticate
from django.contrib.auth.models import User

from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["POST"])
@permission_classes([AllowAny])
def signup(request):
    name = request.data.get("name", "").strip()
    email = request.data.get("email", "").strip().lower()
    password = request.data.get("password", "")

    if not name:
        return Response(
            {"error": "Name is required."},
            status=400,
        )

    if not email:
        return Response(
            {"error": "Email is required."},
            status=400,
        )

    if not password:
        return Response(
            {"error": "Password is required."},
            status=400,
        )

    if len(password) < 8:
        return Response(
            {
                "error": (
                    "Password must be at least 8 characters."
                )
            },
            status=400,
        )

    if User.objects.filter(username=email).exists():
        return Response(
            {
                "error": (
                    "An account with this email already exists."
                )
            },
            status=400,
        )

    user = User.objects.create_user(
        username=email,
        email=email,
        first_name=name,
        password=password,
    )

    token = Token.objects.create(user=user)

    return Response(
        {
            "message": "Account created successfully.",
            "token": token.key,
            "user": {
                "id": user.id,
                "name": user.first_name,
                "email": user.email,
            },
        },
        status=201,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    email = request.data.get("email", "").strip().lower()
    password = request.data.get("password", "")

    if not email:
        return Response(
            {"error": "Email is required."},
            status=400,
        )

    if not password:
        return Response(
            {"error": "Password is required."},
            status=400,
        )

    user = authenticate(
        request,
        username=email,
        password=password,
    )

    if user is None:
        return Response(
            {"error": "Invalid email or password."},
            status=401,
        )

    token, created = Token.objects.get_or_create(user=user)

    return Response(
        {
            "message": "Login successful.",
            "token": token.key,
            "user": {
                "id": user.id,
                "name": user.first_name,
                "email": user.email,
            },
        },
        status=200,
    )


@api_view(["GET"])
def me(request):
    return Response(
        {
            "id": request.user.id,
            "name": request.user.first_name,
            "email": request.user.email,
        },
        status=200,
    )


@api_view(["POST"])
def logout(request):
    request.user.auth_token.delete()

    return Response(
        {"message": "Logged out successfully."},
        status=200,
    )