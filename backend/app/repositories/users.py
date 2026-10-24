"""SQL operations for user records."""

from uuid import UUID

import psycopg


def create(database_url: str, user_id: UUID, email: str, password_hash: str) -> None:
    with psycopg.connect(database_url) as connection:
        connection.execute(
            "INSERT INTO users (id, email, password_hash, role) VALUES (%s, %s, %s, %s)",
            (user_id, email, password_hash, "user"),
        )


def find_by_email(database_url: str, email: str) -> tuple | None:
    with psycopg.connect(database_url) as connection:
        return connection.execute(
            "SELECT id, password_hash, role FROM users WHERE email = %s", (email,)
        ).fetchone()


def find_by_id(database_url: str, user_id: UUID) -> tuple | None:
    with psycopg.connect(database_url) as connection:
        return connection.execute(
            "SELECT id, email, role FROM users WHERE id = %s", (user_id,)
        ).fetchone()


def upsert_admin(database_url: str, user_id: UUID, email: str, password_hash: str) -> None:
    with psycopg.connect(database_url) as connection:
        connection.execute(
            "INSERT INTO users (id, email, password_hash, role) "
            "VALUES (%s, %s, %s, 'admin') "
            "ON CONFLICT (email) DO UPDATE SET role = 'admin'",
            (user_id, email, password_hash),
        )
