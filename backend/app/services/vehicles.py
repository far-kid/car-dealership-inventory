"""Vehicle catalogue and stock rules."""

from uuid import UUID, uuid4

from fastapi import HTTPException

from app.repositories import vehicles as repository
from app.schemas.vehicles import VehicleInput


def create(database_url: str, details: VehicleInput) -> dict:
    return repository.create(database_url, uuid4(), details.model_dump())


def list_all(database_url: str) -> list[dict]:
    return repository.list_all(database_url)


def get(database_url: str, vehicle_id: UUID) -> dict:
    vehicle = repository.find_by_id(database_url, vehicle_id)
    if vehicle is None:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle


def search(
    database_url: str,
    make: str | None,
    model: str | None,
    category: str | None,
    min_price: int | None,
    max_price: int | None,
) -> list[dict]:
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(status_code=422, detail="Minimum price exceeds maximum price")
    return repository.search(database_url, make, model, category, min_price, max_price)


def update(database_url: str, vehicle_id: UUID, details: VehicleInput) -> dict:
    vehicle = repository.update(database_url, vehicle_id, details.model_dump())
    if vehicle is None:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle


def delete(database_url: str, vehicle_id: UUID) -> None:
    if not repository.delete(database_url, vehicle_id):
        raise HTTPException(status_code=404, detail="Vehicle not found")


def purchase(database_url: str, vehicle_id: UUID) -> dict:
    vehicle, exists = repository.purchase(database_url, vehicle_id)
    if vehicle is not None:
        return vehicle
    if not exists:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    raise HTTPException(status_code=409, detail="Vehicle is out of stock")


def restock(database_url: str, vehicle_id: UUID, quantity: int) -> dict:
    vehicle = repository.restock(database_url, vehicle_id, quantity)
    if vehicle is None:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle
