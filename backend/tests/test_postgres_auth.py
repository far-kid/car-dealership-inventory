"""Integration tests against the dedicated PostgreSQL test database."""

import os
from uuid import uuid4

import psycopg
import pytest
from fastapi.testclient import TestClient

def test_registration_persists_user_in_postgres():
    from app.main import create_app

    database_url = os.getenv("TEST_DATABASE_URL")
    if not database_url:
        pytest.skip("Set TEST_DATABASE_URL to run PostgreSQL integration tests")

    email = f"buyer-{uuid4().hex}@example.com"
    try:
        with TestClient(create_app(database_url=database_url, secret_key="test-secret")) as client:
            response = client.post(
                "/api/auth/register",
                json={"email": email, "password": "secret-password-123"},
            )

        assert response.status_code == 201
        with psycopg.connect(database_url) as connection:
            user = connection.execute(
                "SELECT email, password_hash, role FROM users WHERE email = %s", (email,)
            ).fetchone()

        assert user is not None
        assert user[0] == email
        assert user[1] != "secret-password-123"
        assert user[2] == "user"
    finally:
        with psycopg.connect(database_url) as connection:
            connection.execute("DELETE FROM users WHERE email = %s", (email,))
