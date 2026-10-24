"""Registration endpoint backed by PostgreSQL."""

import hashlib
import secrets
from uuid import UUID, uuid4

import psycopg
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class UserResponse(BaseModel):
    id: UUID
    email: EmailStr


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    iterations = 600_000
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations)
    return f"pbkdf2_sha256${iterations}${salt.hex()}${digest.hex()}"


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, request: Request) -> UserResponse:
    database_url = request.app.state.database_url
    if not database_url:
        raise HTTPException(status_code=503, detail="Database is not configured")

    email = str(payload.email).lower()
    user_id = uuid4()
    with psycopg.connect(database_url) as connection:
        connection.execute(
            "INSERT INTO users (id, email, password_hash, role) VALUES (%s, %s, %s, %s)",
            (user_id, email, hash_password(payload.password), "user"),
        )
    return UserResponse(id=user_id, email=email)
