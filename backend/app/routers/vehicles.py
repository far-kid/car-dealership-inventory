"""HTTP routes for vehicles and inventory."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status

from app.routers.dependencies import database_url, require_admin, require_user
from app.schemas.vehicles import RestockRequest, VehicleInput, VehicleResponse
from app.services import vehicles as service

router = APIRouter(
    prefix="/api/vehicles", tags=["vehicles"], dependencies=[Depends(require_user)]
)


@router.post("", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
def create_vehicle(payload: VehicleInput, request: Request) -> dict:
    return service.create(database_url(request), payload)


@router.get("", response_model=list[VehicleResponse])
def list_vehicles(request: Request) -> list[dict]:
    return service.list_all(database_url(request))


@router.get("/search", response_model=list[VehicleResponse])
def search_vehicles(
    request: Request,
    make: str | None = None,
    model: str | None = None,
    category: str | None = None,
    min_price: Annotated[int | None, Query(ge=0)] = None,
    max_price: Annotated[int | None, Query(ge=0)] = None,
) -> list[dict]:
    return service.search(
        database_url(request), make, model, category, min_price, max_price
    )


@router.get("/{vehicle_id}", response_model=VehicleResponse)
def get_vehicle(vehicle_id: UUID, request: Request) -> dict:
    return service.get(database_url(request), vehicle_id)


@router.put("/{vehicle_id}", response_model=VehicleResponse)
def update_vehicle(vehicle_id: UUID, payload: VehicleInput, request: Request) -> dict:
    return service.update(database_url(request), vehicle_id, payload)


@router.delete(
    "/{vehicle_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin)],
)
def delete_vehicle(vehicle_id: UUID, request: Request) -> None:
    service.delete(database_url(request), vehicle_id)


@router.post("/{vehicle_id}/purchase", response_model=VehicleResponse)
def purchase_vehicle(vehicle_id: UUID, request: Request) -> dict:
    return service.purchase(database_url(request), vehicle_id)


@router.post(
    "/{vehicle_id}/restock",
    response_model=VehicleResponse,
    dependencies=[Depends(require_admin)],
)
def restock_vehicle(vehicle_id: UUID, payload: RestockRequest, request: Request) -> dict:
    return service.restock(database_url(request), vehicle_id, payload.quantity)
