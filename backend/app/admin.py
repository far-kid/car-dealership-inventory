"""Bootstrap an admin without exposing role assignment through registration."""

from uuid import uuid4

import psycopg

from app.security import hash_password


def ensure_admin(database_url: str, email: str, password: str) -> None:
    """Create an admin or promote an existing user, preserving their password."""
    normalized_email = email.strip().lower()
    with psycopg.connect(database_url) as connection:
        connection.execute(
            "INSERT INTO users (id, email, password_hash, role) "
            "VALUES (%s, %s, %s, 'admin') "
            "ON CONFLICT (email) DO UPDATE SET role = 'admin'",
            (uuid4(), normalized_email, hash_password(password)),
        )
