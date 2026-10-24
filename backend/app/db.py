"""Database schema bootstrap."""

import psycopg

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""


def create_schema(database_url: str) -> None:
    """Create missing tables; safe to run on every startup."""
    with psycopg.connect(database_url) as connection:
        connection.execute(SCHEMA)
