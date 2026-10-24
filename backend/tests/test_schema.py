"""The app must create its own tables so a fresh database works out of the box."""

import psycopg
import pytest

from app.db import create_schema


def test_startup_creates_the_users_table(client, database_url):
    with psycopg.connect(database_url) as connection:
        columns = {
            row[0]
            for row in connection.execute(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'users'"
            )
        }

    assert {"id", "email", "password_hash", "role"} <= columns


def test_create_schema_is_idempotent(database_url):
    create_schema(database_url)
    create_schema(database_url)


def test_users_role_is_limited_to_user_or_admin(client, database_url):
    with pytest.raises(psycopg.errors.CheckViolation):
        with psycopg.connect(database_url) as connection:
            connection.execute(
                "INSERT INTO users (id, email, password_hash, role) "
                "VALUES (gen_random_uuid(), 'bad-role@example.com', 'x', 'superuser')"
            )
