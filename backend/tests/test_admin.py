"""Bootstrapping admins, and making sure nobody can register as one."""

from uuid import uuid4

import psycopg
import pytest

from app.admin import ensure_admin
from app.security import decode_access_token
from tests.conftest import TEST_SECRET

PASSWORD = "admin-password-123"


@pytest.fixture
def email(database_url):
    address = f"admin-{uuid4().hex}@example.com"
    yield address
    with psycopg.connect(database_url) as connection:
        connection.execute("DELETE FROM users WHERE email = %s", (address,))


def role_of(database_url, address) -> str | None:
    with psycopg.connect(database_url) as connection:
        row = connection.execute("SELECT role FROM users WHERE email = %s", (address,)).fetchone()
    return row[0] if row else None


def login_claims(client, address, password) -> dict:
    response = client.post("/api/auth/login", json={"email": address, "password": password})
    assert response.status_code == 200, response.text
    return decode_access_token(response.json()["access_token"], TEST_SECRET)


def test_ensure_admin_creates_an_admin_who_can_log_in(client, database_url, email):
    ensure_admin(database_url, email, PASSWORD)

    assert role_of(database_url, email) == "admin"
    assert login_claims(client, email, PASSWORD)["role"] == "admin"


def test_ensure_admin_promotes_an_existing_user_and_keeps_their_password(
    client, database_url, email
):
    client.post("/api/auth/register", json={"email": email, "password": "original-pass-1"})

    ensure_admin(database_url, email, PASSWORD)

    assert role_of(database_url, email) == "admin"
    assert login_claims(client, email, "original-pass-1")["role"] == "admin"


def test_ensure_admin_is_idempotent(client, database_url, email):
    ensure_admin(database_url, email, PASSWORD)
    ensure_admin(database_url, email, PASSWORD)

    with psycopg.connect(database_url) as connection:
        count = connection.execute(
            "SELECT count(*) FROM users WHERE email = %s", (email,)
        ).fetchone()[0]
    assert count == 1


def test_ensure_admin_normalises_the_email_case(client, database_url, email):
    ensure_admin(database_url, email.upper(), PASSWORD)

    assert role_of(database_url, email) == "admin"


def test_register_ignores_an_attempt_to_self_assign_admin(client, database_url, email):
    response = client.post(
        "/api/auth/register", json={"email": email, "password": PASSWORD, "role": "admin"}
    )

    assert response.status_code == 201
    assert role_of(database_url, email) == "user"
    assert login_claims(client, email, PASSWORD)["role"] == "user"


def test_an_admin_token_from_login_can_use_admin_routes(
    vehicles_client, database_url, email, create_vehicle
):
    ensure_admin(database_url, email, PASSWORD)
    token = vehicles_client.post(
        "/api/auth/login", json={"email": email, "password": PASSWORD}
    ).json()["access_token"]
    vehicle = create_vehicle()

    response = vehicles_client.delete(
        f"/api/vehicles/{vehicle['id']}", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 204
