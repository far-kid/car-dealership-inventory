"""FastAPI application entry point."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.auth import router as auth_router
from app.db import create_schema
from app.vehicles import router as vehicles_router


@asynccontextmanager
async def lifespan(application: FastAPI):
    if application.state.database_url:
        create_schema(application.state.database_url)
    yield


def create_app(database_url: str | None = None, secret_key: str | None = None) -> FastAPI:
    application = FastAPI(title="Car Dealership Inventory System", lifespan=lifespan)
    application.state.database_url = database_url or os.getenv("DATABASE_URL")
    application.state.secret_key = secret_key or os.getenv("JWT_SECRET_KEY")
    configured_origins = os.getenv("CORS_ORIGINS")
    origins = (
        [origin.strip() for origin in configured_origins.split(",") if origin.strip()]
        if configured_origins is not None
        else ["http://localhost:5173"]
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(auth_router)
    application.include_router(vehicles_router)

    @application.get("/api/health")
    def health() -> dict[str, str]:
        """Liveness probe used by tests and deployment checks."""
        return {"status": "ok"}

    return application


app = create_app()
