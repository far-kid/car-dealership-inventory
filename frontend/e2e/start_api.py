"""Start the unchanged FastAPI app against an explicitly isolated browser-test DB."""

import os
from pathlib import Path
import sys
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

database_url = os.environ.get("E2E_DATABASE_URL", "")
parsed = urlparse(database_url)
if parsed.hostname not in {"localhost", "127.0.0.1", "::1"} or not parsed.path.endswith("_e2e"):
    raise SystemExit("E2E_DATABASE_URL must point to a LOCAL database whose name ends in _e2e.")

password = os.environ.get("E2E_ADMIN_PASSWORD")
if not password or len(password) < 8:
    raise SystemExit("Set E2E_ADMIN_PASSWORD to a test-only password of at least 8 characters.")

from app.db import create_schema
from app.services.auth import ensure_admin
from app.main import create_app
import uvicorn

create_schema(database_url)
ensure_admin(database_url, "admin@motorway.example.com", password)
app = create_app(database_url=database_url, secret_key="isolated-e2e-secret-never-use-in-production")
uvicorn.run(app, host="127.0.0.1", port=8000)
