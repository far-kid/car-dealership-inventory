"""Edge cases in user input that the happy-path tests don't reach."""

import pytest

from tests.conftest import VEHICLE


@pytest.mark.parametrize("field", ["make", "model", "category"])
def test_whitespace_only_text_fields_are_rejected(vehicles_client, user_headers, field):
    response = vehicles_client.post(
        "/api/vehicles", json={**VEHICLE, field: "   "}, headers=user_headers
    )

    assert response.status_code == 422


def test_text_fields_are_trimmed(vehicles_client, user_headers):
    response = vehicles_client.post(
        "/api/vehicles",
        json={**VEHICLE, "make": "  Toyota ", "model": " Corolla", "category": "Sedan  "},
        headers=user_headers,
    )

    assert response.status_code == 201
    body = response.json()
    assert (body["make"], body["model"], body["category"]) == ("Toyota", "Corolla", "Sedan")


@pytest.mark.parametrize("field", ["make", "model", "category"])
def test_text_fields_have_a_sensible_maximum_length(vehicles_client, user_headers, field):
    response = vehicles_client.post(
        "/api/vehicles", json={**VEHICLE, field: "x" * 101}, headers=user_headers
    )

    assert response.status_code == 422


def test_price_must_be_a_number_not_a_string(vehicles_client, user_headers):
    response = vehicles_client.post(
        "/api/vehicles", json={**VEHICLE, "price": "25000"}, headers=user_headers
    )

    assert response.status_code == 422


def test_register_caps_password_length(client):
    """Unbounded passwords let one request burn a lot of CPU in the password hash."""
    response = client.post(
        "/api/auth/register", json={"email": "long@example.com", "password": "p" * 129}
    )

    assert response.status_code == 422


def test_register_rejects_a_password_shorter_than_eight_characters(client):
    response = client.post(
        "/api/auth/register", json={"email": "short@example.com", "password": "1234567"}
    )

    assert response.status_code == 422
