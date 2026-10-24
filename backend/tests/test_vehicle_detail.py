"""A vehicle detail endpoint for the frontend edit form."""

from uuid import uuid4


def test_detail_returns_the_vehicle(vehicles_client, user_headers, create_vehicle):
    vehicle = create_vehicle()

    response = vehicles_client.get(
        f"/api/vehicles/{vehicle['id']}", headers=user_headers
    )

    assert response.status_code == 200
    assert response.json() == vehicle


def test_detail_returns_404_for_an_unknown_vehicle(vehicles_client, user_headers):
    response = vehicles_client.get(f"/api/vehicles/{uuid4()}", headers=user_headers)

    assert response.status_code == 404


def test_detail_rejects_a_malformed_id(vehicles_client, user_headers):
    response = vehicles_client.get("/api/vehicles/not-a-uuid", headers=user_headers)

    assert response.status_code == 422


def test_detail_requires_authentication(vehicles_client, create_vehicle):
    vehicle = create_vehicle()

    response = vehicles_client.get(f"/api/vehicles/{vehicle['id']}")

    assert response.status_code == 401
