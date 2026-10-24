from fastapi.testclient import TestClient

from app.main import app


def test_register_creates_user_without_exposing_password():
    response = TestClient(app).post(
        "/api/auth/register",
        json={"email": "buyer@example.com", "password": "secret-password-123"},
    )

    assert response.status_code == 201
    assert response.json()["email"] == "buyer@example.com"
    assert "password" not in response.json()
