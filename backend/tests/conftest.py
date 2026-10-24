"""Shared fixtures for the PostgreSQL integration tests."""

import os

import pytest
from fastapi.testclient import TestClient

from app.main import create_app

# HS256 keys should be at least 32 bytes (RFC 7518 section 3.2).
TEST_SECRET = "test-secret-key-that-is-at-least-32-bytes-long"


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
