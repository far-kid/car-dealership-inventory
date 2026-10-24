"""The React dev server runs on another origin, so the API must allow it (and only it)."""

import pytest
from fastapi.testclient import TestClient

from app.main import create_app

VITE_DEV_SERVER = "http://localhost:5173"


@pytest.fixture
def make_client(monkeypatch):
    def _make(cors_origins: str | None = None) -> TestClient:
        if cors_origins is None:
            monkeypatch.delenv("CORS_ORIGINS", raising=False)
        else:
            monkeypatch.setenv("CORS_ORIGINS", cors_origins)
        return TestClient(create_app())

    return _make


def preflight(client, origin):
    return client.options(
        "/api/auth/login",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization, content-type",
        },
    )


def test_the_vite_dev_server_is_allowed_by_default(make_client):
    response = preflight(make_client(), VITE_DEV_SERVER)

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == VITE_DEV_SERVER
    assert "authorization" in response.headers["access-control-allow-headers"].lower()


def test_an_unknown_origin_is_not_allowed(make_client):
    response = make_client().get("/api/health", headers={"Origin": "https://evil.example"})

    assert "access-control-allow-origin" not in response.headers


def test_allowed_origins_come_from_the_environment(make_client):
    client = make_client("https://cars.example.com, https://admin.cars.example.com")

    for origin in ("https://cars.example.com", "https://admin.cars.example.com"):
        response = client.get("/api/health", headers={"Origin": origin})
        assert response.headers["access-control-allow-origin"] == origin

    response = client.get("/api/health", headers={"Origin": VITE_DEV_SERVER})
    assert "access-control-allow-origin" not in response.headers
