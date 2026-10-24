"""HTTP routes for registration and login."""

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.routers.dependencies import database_url, require_user
from app.schemas.auth import (
    CurrentUserResponse,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.services import auth as service

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, request: Request) -> dict:
    return service.register(database_url(request), str(payload.email), payload.password)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request) -> dict:
    database_url = request.app.state.database_url
    secret_key = request.app.state.secret_key
    if not database_url or not secret_key:
        raise HTTPException(status_code=503, detail="Authentication is not configured")

    # Keep the historical verifier import patchable by the timing regression test.
    from app.auth import auth as compatibility

    return service.login(
        database_url,
        secret_key,
        str(payload.email),
        payload.password,
        compatibility.verify_password,
    )


@router.get("/me", response_model=CurrentUserResponse)
def me(request: Request, claims: dict = Depends(require_user)) -> dict:
    return service.current_user(database_url(request), claims["sub"])
