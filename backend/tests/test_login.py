"""Login endpoint tests against the PostgreSQL test database."""

from uuid import uuid4

import psycopg
import pytest

import app.auth.auth as auth_module

PASSWORD = "secret-password-123"


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


def test_login_hashes_even_for_an_unknown_email(client, monkeypatch):
    """Skipping the slow hash for unknown emails would leak which emails exist via timing."""
    calls = []
    real_verify = auth_module.verify_password

    def spy(password, stored_hash):
        calls.append(stored_hash)
        return real_verify(password, stored_hash)

    monkeypatch.setattr(auth_module, "verify_password", spy)

    client.post("/api/auth/login", json={"email": "nobody@example.com", "password": PASSWORD})

    assert len(calls) == 1


def test_login_requires_a_valid_email_format(client):
    response = client.post("/api/auth/login", json={"email": "not-an-email", "password": PASSWORD})

    assert response.status_code == 422


def test_register_rejects_a_duplicate_email(client, registered_email):
    response = client.post(
        "/api/auth/register", json={"email": registered_email, "password": PASSWORD}
    )

    assert response.status_code == 409
