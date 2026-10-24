"""GET /api/auth/me tells the frontend who is logged in and whether to show admin forms."""

from uuid import uuid4

import psycopg
import pytest

from app.admin import ensure_admin

PASSWORD = "secret-password-123"


@pytest.fixture
def email(database_url):
    address = f"me-{uuid4().hex}@example.com"
    yield address
    with psycopg.connect(database_url) as connection:
        connection.execute("DELETE FROM users WHERE email = %s", (address,))


def token_for(client, address, password=PASSWORD) -> dict[str, str]:
    token = client.post(
        "/api/auth/login", json={"email": address, "password": password}
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_me_returns_the_logged_in_user(client, email):
    registered = client.post(
        "/api/auth/register", json={"email": email, "password": PASSWORD}
    ).json()

    response = client.get("/api/auth/me", headers=token_for(client, email))

    assert response.status_code == 200
    assert response.json() == {"id": registered["id"], "email": email, "role": "user"}


def test_me_reports_the_admin_role(client, database_url, email):
    ensure_admin(database_url, email, PASSWORD)

    response = client.get("/api/auth/me", headers=token_for(client, email))

    assert response.json()["role"] == "admin"


def test_me_never_exposes_the_password_hash(client, email):
    client.post("/api/auth/register", json={"email": email, "password": PASSWORD})

    body = client.get("/api/auth/me", headers=token_for(client, email)).json()

    assert "password" not in body
    assert "password_hash" not in body


def test_me_requires_a_token(client):
    assert client.get("/api/auth/me").status_code == 401


def test_me_rejects_a_token_for_a_deleted_user(client, database_url, email):
    client.post("/api/auth/register", json={"email": email, "password": PASSWORD})
    headers = token_for(client, email)
    with psycopg.connect(database_url) as connection:
        connection.execute("DELETE FROM users WHERE email = %s", (email,))

    assert client.get("/api/auth/me", headers=headers).status_code == 401
