"""Compatibility exports for existing auth callers and tests."""

from app.routers.auth import login, me, register, router
from app.schemas.auth import (
    CurrentUserResponse,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.security import hash_password, verify_password

__all__ = [
    "router",
    "register",
    "login",
    "me",
    "RegisterRequest",
    "LoginRequest",
    "UserResponse",
    "TokenResponse",
    "CurrentUserResponse",
    "hash_password",
    "verify_password",
]
