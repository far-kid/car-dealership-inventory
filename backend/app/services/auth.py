"""Registration, login, and admin rules."""

from collections.abc import Callable
from uuid import UUID, uuid4

from fastapi import HTTPException
from psycopg.errors import UniqueViolation

from app.repositories import users
from app.security import create_access_token, hash_password

_DUMMY_HASH = hash_password("timing-equaliser-not-a-real-password")


def register(database_url: str, email: str, password: str) -> dict:
    email = email.lower()
    user_id = uuid4()
    try:
        users.create(database_url, user_id, email, hash_password(password))
    except UniqueViolation as exc:
        raise HTTPException(status_code=409, detail="Email already registered") from exc
    return {"id": user_id, "email": email}


def login(
    database_url: str,
    secret_key: str,
    email: str,
    password: str,
    verify_password: Callable[[str, str], bool],
) -> dict:
    user = users.find_by_email(database_url, email.lower())
    # Equal work for unknown emails prevents a timing-based account lookup.
    stored_hash = user[1] if user else _DUMMY_HASH
    password_ok = verify_password(password, stored_hash)
    if user is None or not password_ok:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"access_token": create_access_token(str(user[0]), user[2], secret_key)}


def current_user(database_url: str, subject: str) -> dict:
    try:
        user_id = UUID(subject)
    except (ValueError, TypeError) as exc:
        raise HTTPException(status_code=401, detail="Invalid access token") from exc
    user = users.find_by_id(database_url, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid access token")
    return {"id": user[0], "email": user[1], "role": user[2]}


def ensure_admin(database_url: str, email: str, password: str) -> None:
    users.upsert_admin(database_url, uuid4(), email.strip().lower(), hash_password(password))
