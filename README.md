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
cp .env.example .env   # then edit values
uvicorn app.main:app --reload
```

The API runs at http://localhost:8000 and interactive docs are at http://localhost:8000/docs.

## Running tests

```bash
cd backend
pytest
```

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
