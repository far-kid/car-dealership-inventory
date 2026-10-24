"""SQL operations for vehicle records."""

from uuid import UUID

import psycopg
from psycopg.rows import dict_row

VEHICLE_COLUMNS = "id, make, model, category, price, quantity"


def create(database_url: str, vehicle_id: UUID, details: dict) -> dict:
    with psycopg.connect(database_url, row_factory=dict_row) as connection:
        return connection.execute(
            f"INSERT INTO vehicles ({VEHICLE_COLUMNS}) VALUES (%s, %s, %s, %s, %s, %s) "
            f"RETURNING {VEHICLE_COLUMNS}",
            (
                vehicle_id,
                details["make"],
                details["model"],
                details["category"],
                details["price"],
                details["quantity"],
            ),
        ).fetchone()


def list_all(database_url: str) -> list[dict]:
    with psycopg.connect(database_url, row_factory=dict_row) as connection:
        return connection.execute(
            f"SELECT {VEHICLE_COLUMNS} FROM vehicles ORDER BY make, model, id"
        ).fetchall()


def find_by_id(database_url: str, vehicle_id: UUID) -> dict | None:
    with psycopg.connect(database_url, row_factory=dict_row) as connection:
        return connection.execute(
            f"SELECT {VEHICLE_COLUMNS} FROM vehicles WHERE id = %s", (vehicle_id,)
        ).fetchone()


def search(
    database_url: str,
    make: str | None,
    model: str | None,
    category: str | None,
    min_price: int | None,
    max_price: int | None,
) -> list[dict]:
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
    with psycopg.connect(database_url, row_factory=dict_row) as connection:
        return connection.execute(
            f"SELECT {VEHICLE_COLUMNS} FROM vehicles{where} ORDER BY make, model, id",
            values,
        ).fetchall()


def update(database_url: str, vehicle_id: UUID, details: dict) -> dict | None:
    with psycopg.connect(database_url, row_factory=dict_row) as connection:
        return connection.execute(
            "UPDATE vehicles SET make = %s, model = %s, category = %s, "
            "price = %s, quantity = %s WHERE id = %s "
            f"RETURNING {VEHICLE_COLUMNS}",
            (
                details["make"],
                details["model"],
                details["category"],
                details["price"],
                details["quantity"],
                vehicle_id,
            ),
        ).fetchone()


def delete(database_url: str, vehicle_id: UUID) -> bool:
    with psycopg.connect(database_url) as connection:
        return connection.execute(
            "DELETE FROM vehicles WHERE id = %s RETURNING id", (vehicle_id,)
        ).fetchone() is not None


def purchase(database_url: str, vehicle_id: UUID) -> tuple[dict | None, bool]:
    """Decrease stock atomically and report whether an unchanged row exists."""
    with psycopg.connect(database_url, row_factory=dict_row) as connection:
        vehicle = connection.execute(
            "UPDATE vehicles SET quantity = quantity - 1 "
            "WHERE id = %s AND quantity > 0 "
            f"RETURNING {VEHICLE_COLUMNS}",
            (vehicle_id,),
        ).fetchone()
        if vehicle is not None:
            return vehicle, True
        exists = connection.execute(
            "SELECT 1 FROM vehicles WHERE id = %s", (vehicle_id,)
        ).fetchone() is not None
        return None, exists


def restock(database_url: str, vehicle_id: UUID, quantity: int) -> dict | None:
    with psycopg.connect(database_url, row_factory=dict_row) as connection:
        return connection.execute(
            "UPDATE vehicles SET quantity = quantity + %s WHERE id = %s "
            f"RETURNING {VEHICLE_COLUMNS}",
            (quantity, vehicle_id),
        ).fetchone()
