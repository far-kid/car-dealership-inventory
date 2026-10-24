"""Vehicle request and response models."""

from uuid import UUID

from pydantic import BaseModel, Field, field_validator


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
