"""Password hashing and signed access tokens."""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from jwt import InvalidTokenError


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    iterations = 600_000
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations)
    return f"pbkdf2_sha256${iterations}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, iterations, salt, expected = stored_hash.split("$")
        if algorithm != "pbkdf2_sha256":
            return False
        actual = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), bytes.fromhex(salt), int(iterations)
        )
        return secrets.compare_digest(actual, bytes.fromhex(expected))
    except (TypeError, ValueError):
        return False


def create_access_token(
    subject: str,
    role: str,
    secret_key: str,
    expires_in: timedelta = timedelta(hours=1),
) -> str:
    claims = {
        "sub": subject,
        "role": role,
        "exp": datetime.now(timezone.utc) + expires_in,
    }
    return jwt.encode(claims, secret_key, algorithm="HS256")


def decode_access_token(token: str, secret_key: str) -> dict:
    return jwt.decode(
        token,
        secret_key,
        algorithms=["HS256"],
        options={"require": ["sub", "role", "exp"]},
    )
