"""Login endpoint tests against the PostgreSQL test database."""

import os
from uuid import uuid4

import psycopg
import pytest
from fastapi.testclient import TestClient

from app.main import create_app

PASSWORD = "secret-password-123"


@pytest.fixture
def database_url():
    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        pytest.skip("Set TEST_DATABASE_URL to run PostgreSQL integration tests")
    return url


@pytest.fixture
def client(database_url):
    with TestClient(create_app(database_url=database_url, secret_key="test-secret")) as test_client:
        yield test_client


@pytest.fixture
def registered_email(client, database_url):
    email = f"buyer-{uuid4().hex}@example.com"
    client.post("/api/auth/register", json={"email": email, "password": PASSWORD})
    yield email
    with psycopg.connect(database_url) as connection:
        connection.execute("DELETE FROM users WHERE email = %s", (email,))


def test_login_returns_a_bearer_token_for_valid_credentials(client, registered_email):
    response = client.post(
        "/api/auth/login", json={"email": registered_email, "password": PASSWORD}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_login_is_case_insensitive_on_email(client, registered_email):
    response = client.post(
        "/api/auth/login", json={"email": registered_email.upper(), "password": PASSWORD}
    )

    assert response.status_code == 200


def test_login_rejects_a_wrong_password(client, registered_email):
    response = client.post(
        "/api/auth/login", json={"email": registered_email, "password": "wrong-password-1"}
    )

    assert response.status_code == 401


def test_login_does_not_reveal_whether_the_email_exists(client, registered_email):
    unknown = client.post(
        "/api/auth/login", json={"email": "nobody@example.com", "password": PASSWORD}
    )
    wrong_password = client.post(
        "/api/auth/login", json={"email": registered_email, "password": "wrong-password-1"}
    )

    assert unknown.status_code == 401
    assert unknown.json() == wrong_password.json()


def test_login_requires_a_valid_email_format(client):
    response = client.post("/api/auth/login", json={"email": "not-an-email", "password": PASSWORD})

    assert response.status_code == 422


def test_register_rejects_a_duplicate_email(client, registered_email):
    response = client.post(
        "/api/auth/register", json={"email": registered_email, "password": PASSWORD}
    )

    assert response.status_code == 409
