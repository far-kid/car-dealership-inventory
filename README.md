# Car Dealership Inventory System

A full-stack inventory system for a car dealership. Users can register and log in, browse and search vehicles, and purchase them. Admins can add, update, delete and restock vehicles.

- **Backend:** Python, FastAPI, JWT auth, database-backed (PostgreSQL)
- **Frontend:** React, Tailwind CSS, HTML5/CSS3 (planned)
- **Process:** TDD (Red-Green-Refactor), small descriptive commits

## Project structure

```
backend/    FastAPI app (app/) and tests (tests/)
frontend/   React SPA (coming soon)
```

## Backend setup

Requires Python 3.11+.

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate    macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
# Set DATABASE_URL in your shell (see backend/.env.example).
# PowerShell: $env:DATABASE_URL = "postgresql://postgres:<password>@localhost:5432/car_dealership"
# PowerShell: $env:JWT_SECRET_KEY = "<random-secret-at-least-32-characters>"
uvicorn app.main:app --reload
```

The API runs at http://localhost:8000 and interactive docs are at http://localhost:8000/docs.

The app creates its tables on startup (`app/db.py`), so you only need to create the empty databases once:

```bash
createdb -U postgres car_dealership
createdb -U postgres car_dealership_test
```

## Running tests

```bash
cd backend
# Point TEST_DATABASE_URL at the dedicated test database (never your real one).
# PowerShell: $env:TEST_DATABASE_URL = "postgresql://postgres:<password>@localhost:5432/car_dealership_test"
pytest
```

Unit tests (password hashing, JWT) always run. Tests that need PostgreSQL are skipped when `TEST_DATABASE_URL` is not set.

## Frontend setup

Coming soon.

## API overview

| Method | Endpoint | Access |
| --- | --- | --- |
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| POST | `/api/vehicles` | Authenticated |
| GET | `/api/vehicles` | Authenticated |
| GET | `/api/vehicles/search` | Authenticated |
| PUT | `/api/vehicles/:id` | Authenticated |
| DELETE | `/api/vehicles/:id` | Admin |
| POST | `/api/vehicles/:id/purchase` | Authenticated |
| POST | `/api/vehicles/:id/restock` | Admin |

## Test report

To be added.

## Screenshots

To be added.

## My AI Usage

To be added.
