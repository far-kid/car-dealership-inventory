"""Registration and login endpoints backed by PostgreSQL."""

from uuid import UUID, uuid4

import psycopg
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field
from psycopg.errors import UniqueViolation

from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

_DUMMY_HASH = hash_password("timing-equaliser-not-a-real-password")


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: UUID
    email: EmailStr


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, request: Request) -> UserResponse:
    database_url = request.app.state.database_url
    if not database_url:
        raise HTTPException(status_code=503, detail="Database is not configured")

    email = str(payload.email).lower()
    user_id = uuid4()
    try:
        with psycopg.connect(database_url) as connection:
            connection.execute(
                "INSERT INTO users (id, email, password_hash, role) VALUES (%s, %s, %s, %s)",
                (user_id, email, hash_password(payload.password), "user"),
            )
    except UniqueViolation as exc:
        raise HTTPException(status_code=409, detail="Email already registered") from exc
    return UserResponse(id=user_id, email=email)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request) -> TokenResponse:
    database_url = request.app.state.database_url
    secret_key = request.app.state.secret_key
    if not database_url or not secret_key:
        raise HTTPException(status_code=503, detail="Authentication is not configured")

    with psycopg.connect(database_url) as connection:
        user = connection.execute(
            "SELECT id, password_hash, role FROM users WHERE email = %s",
            (str(payload.email).lower(),),
        ).fetchone()

    # Always run the slow hash so response time doesn't reveal unknown emails.
    stored_hash = user[1] if user else _DUMMY_HASH
    password_ok = verify_password(payload.password, stored_hash)
    if user is None or not password_ok:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return TokenResponse(access_token=create_access_token(str(user[0]), user[2], secret_key))
