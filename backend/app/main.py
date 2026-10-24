"""FastAPI application entry point."""
from fastapi import FastAPI

app = FastAPI(title="Car Dealership Inventory System")


@app.get("/api/health")
def health() -> dict[str, str]:
    """Liveness probe used by tests and deployment checks."""
    return {"status": "ok"}
