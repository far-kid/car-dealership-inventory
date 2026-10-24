"""Shared fixtures for the PostgreSQL integration tests."""

import os
from uuid import uuid4

import psycopg
import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.security import create_access_token

# HS256 keys should be at least 32 bytes (RFC 7518 section 3.2).
TEST_SECRET = "test-secret-key-that-is-at-least-32-bytes-long"

VEHICLE = {
    "make": "Toyota",
    "model": "Corolla",
    "category": "Sedan",
    "price": 25000,
    "quantity": 3,
}


def bearer(role: str, secret: str = TEST_SECRET, **token_options) -> dict[str, str]:
    token = create_access_token(str(uuid4()), role, secret, **token_options)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def database_url():
    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        pytest.skip("Set TEST_DATABASE_URL to run PostgreSQL integration tests")
    return url


@pytest.fixture
def client(database_url):
    with TestClient(create_app(database_url=database_url, secret_key=TEST_SECRET)) as test_client:
        yield test_client


@pytest.fixture
def user_headers():
    return bearer("user")


@pytest.fixture
def admin_headers():
    return bearer("admin")


def _clear_vehicles(database_url: str) -> None:
    with psycopg.connect(database_url) as connection:
        if connection.execute("SELECT to_regclass('vehicles')").fetchone()[0]:
            connection.execute("DELETE FROM vehicles")


@pytest.fixture
def vehicles_client(client, database_url):
    """A client whose vehicles table starts and ends empty."""
    _clear_vehicles(database_url)
    yield client
    _clear_vehicles(database_url)


@pytest.fixture
def create_vehicle(vehicles_client, admin_headers):
    def _create(**overrides) -> dict:
        response = vehicles_client.post(
            "/api/vehicles", json={**VEHICLE, **overrides}, headers=admin_headers
        )
        assert response.status_code == 201, response.text
        return response.json()

    return _create
