"""Vehicle catalogue and inventory endpoints."""

from typing import Annotated
from uuid import UUID, uuid4

import psycopg
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from psycopg.rows import dict_row
from pydantic import BaseModel, Field, field_validator

from app.auth.dependencies import require_admin, require_user

router = APIRouter(
    prefix="/api/vehicles", tags=["vehicles"], dependencies=[Depends(require_user)]
)

VEHICLE_COLUMNS = "id, make, model, category, price, quantity"


class VehicleInput(BaseModel):
    make: str = Field(min_length=1, max_length=100)
    model: str = Field(min_length=1, max_length=100)
    category: str = Field(min_length=1, max_length=100)
    price: int = Field(gt=0, strict=True)
    quantity: int = Field(ge=0, strict=True)

    @field_validator("make", "model", "category", mode="before")
    @classmethod
    def trim_text(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class VehicleResponse(VehicleInput):
    id: UUID


class RestockRequest(BaseModel):
    quantity: int = Field(gt=0, strict=True)


def database_url(request: Request) -> str:
    url = request.app.state.database_url
    if not url:
        raise HTTPException(status_code=503, detail="Database is not configured")
    return url


@router.post("", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
def create_vehicle(payload: VehicleInput, request: Request) -> dict:
    vehicle_id = uuid4()
    with psycopg.connect(database_url(request), row_factory=dict_row) as connection:
        return connection.execute(
            f"INSERT INTO vehicles ({VEHICLE_COLUMNS}) VALUES (%s, %s, %s, %s, %s, %s) "
            f"RETURNING {VEHICLE_COLUMNS}",
            (
                vehicle_id,
                payload.make,
                payload.model,
                payload.category,
                payload.price,
                payload.quantity,
            ),
        ).fetchone()


@router.get("", response_model=list[VehicleResponse])
def list_vehicles(request: Request) -> list[dict]:
    with psycopg.connect(database_url(request), row_factory=dict_row) as connection:
        return connection.execute(
            f"SELECT {VEHICLE_COLUMNS} FROM vehicles ORDER BY make, model, id"
        ).fetchall()


@router.get("/search", response_model=list[VehicleResponse])
def search_vehicles(
    request: Request,
    make: str | None = None,
    model: str | None = None,
    category: str | None = None,
    min_price: Annotated[int | None, Query(ge=0)] = None,
    max_price: Annotated[int | None, Query(ge=0)] = None,
) -> list[dict]:
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(status_code=422, detail="Minimum price exceeds maximum price")

    clauses = []
    values = []
    for field, term in (("make", make), ("model", model), ("category", category)):
        if term is not None:
            clauses.append(f"{field} ILIKE %s")
            values.append(f"%{term}%")
    if min_price is not None:
        clauses.append("price >= %s")
        values.append(min_price)
    if max_price is not None:
        clauses.append("price <= %s")
        values.append(max_price)

    where = f" WHERE {' AND '.join(clauses)}" if clauses else ""
    with psycopg.connect(database_url(request), row_factory=dict_row) as connection:
        return connection.execute(
            f"SELECT {VEHICLE_COLUMNS} FROM vehicles{where} ORDER BY make, model, id",
            values,
        ).fetchall()


@router.put("/{vehicle_id}", response_model=VehicleResponse)
def update_vehicle(vehicle_id: UUID, payload: VehicleInput, request: Request) -> dict:
    with psycopg.connect(database_url(request), row_factory=dict_row) as connection:
        vehicle = connection.execute(
            "UPDATE vehicles SET make = %s, model = %s, category = %s, "
            "price = %s, quantity = %s WHERE id = %s "
            f"RETURNING {VEHICLE_COLUMNS}",
            (
                payload.make,
                payload.model,
                payload.category,
                payload.price,
                payload.quantity,
                vehicle_id,
            ),
        ).fetchone()
    if vehicle is None:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle


@router.delete(
    "/{vehicle_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin)],
)
def delete_vehicle(vehicle_id: UUID, request: Request) -> None:
    with psycopg.connect(database_url(request)) as connection:
        deleted = connection.execute(
            "DELETE FROM vehicles WHERE id = %s RETURNING id", (vehicle_id,)
        ).fetchone()
    if deleted is None:
        raise HTTPException(status_code=404, detail="Vehicle not found")


@router.post("/{vehicle_id}/purchase", response_model=VehicleResponse)
def purchase_vehicle(vehicle_id: UUID, request: Request) -> dict:
    with psycopg.connect(database_url(request), row_factory=dict_row) as connection:
        vehicle = connection.execute(
            "UPDATE vehicles SET quantity = quantity - 1 "
            "WHERE id = %s AND quantity > 0 "
            f"RETURNING {VEHICLE_COLUMNS}",
            (vehicle_id,),
        ).fetchone()
        if vehicle is None:
            exists = connection.execute(
                "SELECT 1 FROM vehicles WHERE id = %s", (vehicle_id,)
            ).fetchone()
            if exists is None:
                raise HTTPException(status_code=404, detail="Vehicle not found")
            raise HTTPException(status_code=409, detail="Vehicle is out of stock")
    return vehicle


@router.post(
    "/{vehicle_id}/restock",
    response_model=VehicleResponse,
    dependencies=[Depends(require_admin)],
)
def restock_vehicle(vehicle_id: UUID, payload: RestockRequest, request: Request) -> dict:
    with psycopg.connect(database_url(request), row_factory=dict_row) as connection:
        vehicle = connection.execute(
            "UPDATE vehicles SET quantity = quantity + %s WHERE id = %s "
            f"RETURNING {VEHICLE_COLUMNS}",
            (payload.quantity, vehicle_id),
        ).fetchone()
    if vehicle is None:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle
