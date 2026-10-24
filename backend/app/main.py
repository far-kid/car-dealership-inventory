"""FastAPI application entry point."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.auth.auth import router as auth_router
from app.db import create_schema


@asynccontextmanager
async def lifespan(application: FastAPI):
    if application.state.database_url:
        create_schema(application.state.database_url)
    yield


def create_app(database_url: str | None = None, secret_key: str | None = None) -> FastAPI:
    application = FastAPI(title="Car Dealership Inventory System", lifespan=lifespan)
    application.state.database_url = database_url or os.getenv("DATABASE_URL")
    application.state.secret_key = secret_key or os.getenv("JWT_SECRET_KEY")
    application.include_router(auth_router)

    @application.get("/api/health")
    def health() -> dict[str, str]:
        """Liveness probe used by tests and deployment checks."""
        return {"status": "ok"}

    return application


app = create_app()
