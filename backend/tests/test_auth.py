import os
from uuid import uuid4

import psycopg
import pytest
from fastapi.testclient import TestClient

from app.main import create_app


def test_register_creates_user_without_exposing_password():
    database_url = os.getenv("TEST_DATABASE_URL")
    if not database_url:
        pytest.skip("Set TEST_DATABASE_URL to run PostgreSQL integration tests")

    email = f"buyer-{uuid4().hex}@example.com"
    try:
        with TestClient(create_app(database_url=database_url)) as client:
            response = client.post(
                "/api/auth/register",
                json={"email": email, "password": "secret-password-123"},
            )
    finally:
        with psycopg.connect(database_url) as connection:
            connection.execute("DELETE FROM users WHERE email = %s", (email,))

    assert response.status_code == 201
    assert response.json()["email"] == email
    assert "password" not in response.json()
