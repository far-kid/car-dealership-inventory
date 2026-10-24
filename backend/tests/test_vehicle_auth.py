"""Every vehicle endpoint is protected by a JWT bearer token."""

from datetime import timedelta
from uuid import uuid4

import psycopg
import pytest

from tests.conftest import bearer

SOME_ID = uuid4()

PROTECTED_ENDPOINTS = [
    ("post", "/api/vehicles"),
    ("get", "/api/vehicles"),
    ("get", "/api/vehicles/search"),
    ("put", f"/api/vehicles/{SOME_ID}"),
    ("delete", f"/api/vehicles/{SOME_ID}"),
    ("post", f"/api/vehicles/{SOME_ID}/purchase"),
    ("post", f"/api/vehicles/{SOME_ID}/restock"),
]


@pytest.mark.parametrize(("method", "path"), PROTECTED_ENDPOINTS)
def test_vehicle_endpoints_reject_requests_without_a_token(vehicles_client, method, path):
    response = vehicles_client.request(method, path)

    assert response.status_code == 401


def test_rejects_a_non_bearer_authorization_header(vehicles_client):
    response = vehicles_client.get("/api/vehicles", headers={"Authorization": "Basic abc123"})

    assert response.status_code == 401


def test_rejects_a_token_signed_with_another_secret(vehicles_client):
    headers = bearer("user", secret="some-other-secret-that-is-32-bytes-long!")

    response = vehicles_client.get("/api/vehicles", headers=headers)

    assert response.status_code == 401


def test_rejects_an_expired_token(vehicles_client):
    headers = bearer("user", expires_in=timedelta(seconds=-1))

    response = vehicles_client.get("/api/vehicles", headers=headers)

    assert response.status_code == 401


def test_accepts_a_valid_user_token(vehicles_client, user_headers):
    response = vehicles_client.get("/api/vehicles", headers=user_headers)

    assert response.status_code == 200


def test_a_token_from_login_grants_access(vehicles_client, database_url):
    email = f"buyer-{uuid4().hex}@example.com"
    password = "secret-password-123"
    vehicles_client.post("/api/auth/register", json={"email": email, "password": password})
    try:
        token = vehicles_client.post(
            "/api/auth/login", json={"email": email, "password": password}
        ).json()["access_token"]

        response = vehicles_client.get(
            "/api/vehicles", headers={"Authorization": f"Bearer {token}"}
        )
    finally:
        with psycopg.connect(database_url) as connection:
            connection.execute("DELETE FROM users WHERE email = %s", (email,))

    assert response.status_code == 200
