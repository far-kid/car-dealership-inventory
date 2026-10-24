"""Purchasing and restocking stock."""

from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

import pytest


def quantity_of(client, headers, vehicle_id) -> int:
    vehicles = client.get("/api/vehicles", headers=headers).json()
    return next(vehicle["quantity"] for vehicle in vehicles if vehicle["id"] == vehicle_id)


# --- purchase ---------------------------------------------------------------


def test_purchase_decrements_the_quantity_by_one(vehicles_client, user_headers, create_vehicle):
    vehicle = create_vehicle(quantity=3)

    response = vehicles_client.post(
        f"/api/vehicles/{vehicle['id']}/purchase", headers=user_headers
    )

    assert response.status_code == 200
    assert response.json()["quantity"] == 2
    assert quantity_of(vehicles_client, user_headers, vehicle["id"]) == 2


def test_purchase_is_rejected_when_out_of_stock(vehicles_client, user_headers, create_vehicle):
    vehicle = create_vehicle(quantity=0)

    response = vehicles_client.post(
        f"/api/vehicles/{vehicle['id']}/purchase", headers=user_headers
    )

    assert response.status_code == 409
    assert quantity_of(vehicles_client, user_headers, vehicle["id"]) == 0


def test_purchase_returns_404_for_an_unknown_vehicle(vehicles_client, user_headers):
    response = vehicles_client.post(f"/api/vehicles/{uuid4()}/purchase", headers=user_headers)

    assert response.status_code == 404


def test_concurrent_purchases_never_oversell(vehicles_client, user_headers, create_vehicle):
    vehicle = create_vehicle(quantity=3)

    def buy(_):
        return vehicles_client.post(
            f"/api/vehicles/{vehicle['id']}/purchase", headers=user_headers
        ).status_code

    with ThreadPoolExecutor(max_workers=8) as pool:
        statuses = list(pool.map(buy, range(8)))

    assert statuses.count(200) == 3
    assert statuses.count(409) == 5
    assert quantity_of(vehicles_client, user_headers, vehicle["id"]) == 0


# --- restock (admin only) ---------------------------------------------------


def test_admin_restock_adds_to_the_quantity(vehicles_client, admin_headers, create_vehicle):
    vehicle = create_vehicle(quantity=3)

    response = vehicles_client.post(
        f"/api/vehicles/{vehicle['id']}/restock", json={"quantity": 5}, headers=admin_headers
    )

    assert response.status_code == 200
    assert response.json()["quantity"] == 8
    assert quantity_of(vehicles_client, admin_headers, vehicle["id"]) == 8


def test_restocking_makes_a_sold_out_vehicle_purchasable_again(
    vehicles_client, user_headers, admin_headers, create_vehicle
):
    vehicle = create_vehicle(quantity=0)
    vehicles_client.post(
        f"/api/vehicles/{vehicle['id']}/restock", json={"quantity": 1}, headers=admin_headers
    )

    response = vehicles_client.post(
        f"/api/vehicles/{vehicle['id']}/purchase", headers=user_headers
    )

    assert response.status_code == 200
    assert response.json()["quantity"] == 0


def test_regular_user_cannot_restock(vehicles_client, user_headers, create_vehicle):
    vehicle = create_vehicle(quantity=3)

    response = vehicles_client.post(
        f"/api/vehicles/{vehicle['id']}/restock", json={"quantity": 5}, headers=user_headers
    )

    assert response.status_code == 403
    assert quantity_of(vehicles_client, user_headers, vehicle["id"]) == 3


@pytest.mark.parametrize("payload", [{"quantity": 0}, {"quantity": -2}, {"quantity": 1.5}, {}])
def test_restock_requires_a_positive_whole_quantity(
    vehicles_client, admin_headers, create_vehicle, payload
):
    vehicle = create_vehicle()

    response = vehicles_client.post(
        f"/api/vehicles/{vehicle['id']}/restock", json=payload, headers=admin_headers
    )

    assert response.status_code == 422


def test_restock_returns_404_for_an_unknown_vehicle(vehicles_client, admin_headers):
    response = vehicles_client.post(
        f"/api/vehicles/{uuid4()}/restock", json={"quantity": 5}, headers=admin_headers
    )

    assert response.status_code == 404
