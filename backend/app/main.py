"""FastAPI application entry point."""

import os

from fastapi import FastAPI

from app.auth.auth import router as auth_router


def create_app(database_url: str | None = None, secret_key: str | None = None) -> FastAPI:
    application = FastAPI(title="Car Dealership Inventory System")
    application.state.database_url = database_url or os.getenv("DATABASE_URL")
    application.state.secret_key = secret_key or os.getenv("JWT_SECRET_KEY")
    application.include_router(auth_router)

    @application.get("/api/health")
    def health() -> dict[str, str]:
        """Liveness probe used by tests and deployment checks."""
        return {"status": "ok"}

    return application


app = create_app()
