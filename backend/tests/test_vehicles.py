"""Vehicle CRUD and search."""

from uuid import uuid4

import pytest

from tests.conftest import VEHICLE

# --- create -----------------------------------------------------------------


def test_create_vehicle_returns_it_with_an_id(vehicles_client, user_headers):
    response = vehicles_client.post("/api/vehicles", json=VEHICLE, headers=user_headers)

    assert response.status_code == 201
    body = response.json()
    assert body["id"]
    assert {key: body[key] for key in VEHICLE} == VEHICLE


@pytest.mark.parametrize(
    "overrides",
    [
        {"make": ""},
        {"model": ""},
        {"category": ""},
        {"price": 0},
        {"price": -100},
        {"quantity": -1},
        {"quantity": 1.5},
    ],
)
def test_create_vehicle_rejects_invalid_data(vehicles_client, user_headers, overrides):
    response = vehicles_client.post(
        "/api/vehicles", json={**VEHICLE, **overrides}, headers=user_headers
    )

    assert response.status_code == 422


@pytest.mark.parametrize("missing", ["make", "model", "category", "price", "quantity"])
def test_create_vehicle_requires_every_field(vehicles_client, user_headers, missing):
    payload = {key: value for key, value in VEHICLE.items() if key != missing}

    response = vehicles_client.post("/api/vehicles", json=payload, headers=user_headers)

    assert response.status_code == 422


# --- list -------------------------------------------------------------------


def test_list_is_empty_when_there_are_no_vehicles(vehicles_client, user_headers):
    response = vehicles_client.get("/api/vehicles", headers=user_headers)

    assert response.status_code == 200
    assert response.json() == []


def test_list_returns_every_vehicle(vehicles_client, user_headers, create_vehicle):
    corolla = create_vehicle()
    civic = create_vehicle(make="Honda", model="Civic")

    response = vehicles_client.get("/api/vehicles", headers=user_headers)

    assert {vehicle["id"] for vehicle in response.json()} == {corolla["id"], civic["id"]}


# --- search -----------------------------------------------------------------


@pytest.fixture
def showroom(create_vehicle):
    return {
        "corolla": create_vehicle(make="Toyota", model="Corolla", category="Sedan", price=25000),
        "rav4": create_vehicle(make="Toyota", model="RAV4", category="SUV", price=32000),
        "civic": create_vehicle(make="Honda", model="Civic", category="Sedan", price=24000),
        "f150": create_vehicle(make="Ford", model="F-150", category="Truck", price=45000),
    }


def search(client, headers, **params) -> set[str]:
    response = client.get("/api/vehicles/search", params=params, headers=headers)
    assert response.status_code == 200, response.text
    return {vehicle["model"] for vehicle in response.json()}


def test_search_by_make_is_case_insensitive_and_partial(vehicles_client, user_headers, showroom):
    assert search(vehicles_client, user_headers, make="toy") == {"Corolla", "RAV4"}


def test_search_by_model(vehicles_client, user_headers, showroom):
    assert search(vehicles_client, user_headers, model="civ") == {"Civic"}


def test_search_by_category_is_case_insensitive(vehicles_client, user_headers, showroom):
    assert search(vehicles_client, user_headers, category="sedan") == {"Corolla", "Civic"}


def test_search_by_price_range_is_inclusive(vehicles_client, user_headers, showroom):
    result = search(vehicles_client, user_headers, min_price=25000, max_price=32000)

    assert result == {"Corolla", "RAV4"}


def test_search_with_only_a_minimum_price(vehicles_client, user_headers, showroom):
    assert search(vehicles_client, user_headers, min_price=40000) == {"F-150"}


def test_search_with_only_a_maximum_price(vehicles_client, user_headers, showroom):
    assert search(vehicles_client, user_headers, max_price=24000) == {"Civic"}


def test_search_combines_filters(vehicles_client, user_headers, showroom):
    assert search(vehicles_client, user_headers, make="toyota", category="sedan") == {"Corolla"}


def test_search_without_filters_returns_everything(vehicles_client, user_headers, showroom):
    assert search(vehicles_client, user_headers) == {"Corolla", "RAV4", "Civic", "F-150"}


def test_search_with_no_match_returns_an_empty_list(vehicles_client, user_headers, showroom):
    assert search(vehicles_client, user_headers, make="Ferrari") == set()


def test_search_rejects_a_minimum_above_the_maximum(vehicles_client, user_headers):
    response = vehicles_client.get(
        "/api/vehicles/search",
        params={"min_price": 50000, "max_price": 10000},
        headers=user_headers,
    )

    assert response.status_code == 422


# --- update -----------------------------------------------------------------


def test_update_replaces_the_vehicle_details(vehicles_client, user_headers, create_vehicle):
    vehicle = create_vehicle()
    changes = {**VEHICLE, "model": "Corolla Hybrid", "price": 27500}

    response = vehicles_client.put(
        f"/api/vehicles/{vehicle['id']}", json=changes, headers=user_headers
    )

    assert response.status_code == 200
    assert response.json() == {"id": vehicle["id"], **changes}
    listed = vehicles_client.get("/api/vehicles", headers=user_headers).json()
    assert listed == [{"id": vehicle["id"], **changes}]


def test_update_returns_404_for_an_unknown_vehicle(vehicles_client, user_headers):
    response = vehicles_client.put(f"/api/vehicles/{uuid4()}", json=VEHICLE, headers=user_headers)

    assert response.status_code == 404


def test_update_rejects_invalid_data(vehicles_client, user_headers, create_vehicle):
    vehicle = create_vehicle()

    response = vehicles_client.put(
        f"/api/vehicles/{vehicle['id']}", json={**VEHICLE, "price": -1}, headers=user_headers
    )

    assert response.status_code == 422


def test_update_rejects_a_malformed_id(vehicles_client, user_headers):
    response = vehicles_client.put("/api/vehicles/not-a-uuid", json=VEHICLE, headers=user_headers)

    assert response.status_code == 422


# --- delete (admin only) ----------------------------------------------------


def test_admin_can_delete_a_vehicle(vehicles_client, admin_headers, create_vehicle):
    vehicle = create_vehicle()

    response = vehicles_client.delete(f"/api/vehicles/{vehicle['id']}", headers=admin_headers)

    assert response.status_code == 204
    assert vehicles_client.get("/api/vehicles", headers=admin_headers).json() == []


def test_regular_user_cannot_delete_a_vehicle(
    vehicles_client, user_headers, create_vehicle
):
    vehicle = create_vehicle()

    response = vehicles_client.delete(f"/api/vehicles/{vehicle['id']}", headers=user_headers)

    assert response.status_code == 403
    assert len(vehicles_client.get("/api/vehicles", headers=user_headers).json()) == 1


def test_delete_returns_404_for_an_unknown_vehicle(vehicles_client, admin_headers):
    response = vehicles_client.delete(f"/api/vehicles/{uuid4()}", headers=admin_headers)

    assert response.status_code == 404
