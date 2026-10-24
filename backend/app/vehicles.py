"""Compatibility exports for existing vehicle imports."""

from app.routers.vehicles import router
from app.schemas.vehicles import RestockRequest, VehicleInput, VehicleResponse

__all__ = ["router", "RestockRequest", "VehicleInput", "VehicleResponse"]
