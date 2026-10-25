# Car Dealership Inventory System

A full-stack inventory system for a car dealership. Users can register and log in, browse and search vehicles, and purchase them. Admins can add, update, delete and restock vehicles.

- **Backend:** Python, FastAPI, JWT auth, database-backed (PostgreSQL)
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, HTML5/CSS3
- **Process:** TDD (Red-Green-Refactor), small descriptive commits

## Project structure

```
backend/app/routers/       HTTP endpoints and dependencies
backend/app/services/      Business rules
backend/app/repositories/  PostgreSQL queries
backend/app/schemas/       Request and response models
backend/tests/             Backend tests
frontend/src/auth/         Login, registration and session lifecycle
frontend/src/inventory/    Dashboard, filtering and inventory actions
frontend/src/components/   Shared dialogs, branding and SVG illustrations
frontend/src/lib/          Typed API client and formatting
frontend/src/theme/        Light/dark preference and toggle
frontend/e2e/              Browser tests against an isolated PostgreSQL database
```

## Run locally (Windows PowerShell)

Start PostgreSQL and create the `car_dealership` database once if it does not already exist (see Backend setup below). Open **two PowerShell terminals** at the project root. The backend virtual environment must have its dependencies installed.

Terminal 1 — API:

```powershell
cd backend
$pgPassword = Read-Host 'PostgreSQL password'
$env:DATABASE_URL = "postgresql://postgres:$pgPassword@localhost:5432/car_dealership"
$env:JWT_SECRET_KEY = ([guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N'))
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Terminal 2 — frontend:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Open **http://127.0.0.1:5173** and register a buyer account or sign in. Leave both terminals running. The PostgreSQL password is read into the API terminal's environment; it is not written to a repository file. A new JWT key is generated each time the API terminal starts, so sign in again after restarting it. For admin access, follow the admin command under Backend setup.

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

Registration always creates a regular user. To create or promote the first admin, set `DATABASE_URL` and run this from `backend/`:

```bash
python -m app.admin --email admin@example.com
```

The command prompts for the admin password and creates the database tables if needed. For automation, set a password environment variable and pass its name with `--password-env`.

The API allows `http://localhost:5173` by default. Set `CORS_ORIGINS` to a comma-separated list of allowed origins for another frontend.

## Running tests

```bash
cd backend
# Point TEST_DATABASE_URL at the dedicated test database (never your real one).
# PowerShell: $env:TEST_DATABASE_URL = "postgresql://postgres:<password>@localhost:5432/car_dealership_test"
pytest
```

Unit tests (password hashing, JWT) always run. Tests that need PostgreSQL are skipped when `TEST_DATABASE_URL` is not set.

## Frontend setup

Requires Node.js 22.12+ and the backend running on port 8000. In a second terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`; no policy change is needed. Vite proxies `/api` to `http://127.0.0.1:8000`, so the frontend and API behave as one origin during development.

Register a buyer account from the sign-in screen. Registration returns to sign-in; it never grants admin access. To manage inventory, create/promote an admin with the backend command above, then sign in with that account. An empty database shows an honest empty state; the application never inserts demonstration inventory automatically.

The frontend includes:

- A responsive inventory workspace with live model counts, stock totals, stock value and low-stock counts.
- Combined make/model text search, server-backed make/model/category/price filters, stock views, price/stock sorting and grid/list layouts.
- Confirmed purchases of one unit, disabled purchasing at zero stock, and stock-conflict feedback.
- Admin add/edit/delete/restock dialogs with validation and explicit deletion confirmation.
- Tab-scoped sessions, server-verified roles, expired-session handling, retryable errors, loading and empty states.
- A light/dark control on sign-in and inventory screens. It follows the system theme on first visit and remembers an explicit choice in browser storage.
- Keyboard-accessible native dialogs, focus restoration, reduced-motion support and local font/illustration assets.

### Frontend configuration

Copy `frontend/.env.example` to `frontend/.env.local` only if you need to change the defaults. Vite loads these values at startup/build time; restart after editing them.

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | empty | API origin, without `/api`; empty uses the same origin |
| `VITE_CURRENCY` | `USD` | Three-letter currency code, e.g. `INR` or `EUR` |

The backend stores **whole-number prices** and does not specify a currency. The UI assumes USD unless configured; it does not convert prices. Vehicle illustrations represent categories and are labeled as illustrative previews. No model-year, mileage or vehicle-photo data is invented. Low stock means 1–3 units; inventory value is `sum(price × quantity)` across all models, independent of filters.

```bash
npm test                 # API and React behavior tests
npm run test:coverage    # Coverage report in frontend/coverage/
npm run typecheck
npm run build           # Production assets in frontend/dist/
npm run preview         # Local build preview
```

For deployment, serve `frontend/dist/` and reverse-proxy `/api` to FastAPI. Alternatively, build with `VITE_API_BASE_URL` set to your API origin and add the frontend origin to backend `CORS_ORIGINS`. Never put database passwords or JWT signing secrets in `VITE_*` variables: those values are public browser configuration.

### Running every PostgreSQL test

The backend intentionally skips database tests when `TEST_DATABASE_URL` is absent. Use a dedicated empty test database because tests clear its vehicles table. From `backend/` in PowerShell:

```powershell
# Create this database once (createdb is in the PostgreSQL bin directory).
createdb -h localhost -U postgres car_dealership_test
$env:TEST_DATABASE_URL = 'postgresql://postgres:<postgres-password>@localhost:5432/car_dealership_test'
.\.venv\Scripts\python.exe -m pytest -q -rs
```

If PostgreSQL tools are not on PATH, invoke their full installation path. Percent-encode special characters in a connection-string password. A successful complete run has **no skipped tests**. Environment variables apply only to the terminal in which they are set; a `.env` file is not automatically loaded by the backend test runner.

### Full-stack browser tests

Playwright runs Chromium at desktop and mobile sizes against the real FastAPI app and PostgreSQL. It tests registration/login, admin CRUD/restock, purchase stock exhaustion, persistence after reload, keyboard focus, viewport overflow and axe WCAG A/AA checks. These tests reset vehicle records before each case.

Create a **separate local database whose name ends in `_e2e`**. The harness refuses other database names or nonlocal hosts, and refuses to reuse an already running server on ports 8000/5173.

```powershell
# Run once, with PostgreSQL tools on PATH:
createdb -h localhost -U postgres car_dealership_frontend_e2e
cd frontend
npx.cmd playwright install chromium
$env:E2E_DATABASE_URL = 'postgresql://postgres:<postgres-password>@localhost:5432/car_dealership_frontend_e2e'
$env:E2E_ADMIN_PASSWORD = '<a-test-only-password-at-least-8-characters>'
npm.cmd run test:e2e
```

The harness uses the backend virtualenv by default. Set `E2E_PYTHON` to an alternate Python executable if needed. On macOS/Linux, use `export NAME=value` for environment variables and `npm`/`npx`. The browser-test admin is `admin@motorway.example.com`; its password is supplied only through the test environment. Test screenshots and traces remain ignored in `frontend/test-results/`; the HTML report is in `frontend/playwright-report/`.

If you are already running the app on ports 8000 and 5173, set `E2E_API_PORT=8001` and `E2E_FRONTEND_PORT=5174` before `npm.cmd run test:e2e`. The test servers and Vite proxy will use those ports, leaving the running app alone.

## API overview

| Method | Endpoint | Access |
| --- | --- | --- |
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Authenticated |
| POST | `/api/vehicles` | Authenticated |
| GET | `/api/vehicles` | Authenticated |
| GET | `/api/vehicles/search` | Authenticated |
| GET | `/api/vehicles/:id` | Authenticated |
| PUT | `/api/vehicles/:id` | Authenticated |
| DELETE | `/api/vehicles/:id` | Admin |
| POST | `/api/vehicles/:id/purchase` | Authenticated |
| POST | `/api/vehicles/:id/restock` | Admin |

## Test report

Verified locally on Windows with Node 26 and PostgreSQL 18:

| Check | Result |
| --- | --- |
| Backend, including PostgreSQL integration | 107 passed, 0 skipped; 92% statement coverage |
| Frontend API + React workflows | 27 passed; 90.06% statement coverage |
| Browser (Playwright, desktop + mobile, real API + PostgreSQL, axe WCAG A/AA) | 10 passed |
| TypeScript and production build | Passed |

The backend has an existing FastAPI/httpx deprecation warning. Coverage reports and browser artifacts are generated locally rather than committed.

Frontend history records failing contract tests before the API implementation, failing workflow tests before the UI, and browser accessibility checks before the final refinements. Tests exercise behavior at the HTTP and user-interaction boundaries; PostgreSQL remains the persistent source of inventory data.

## Screenshots

Captured by the Playwright suite against the real API and an isolated PostgreSQL database (sample catalogue created by the test, not shipped with the app).

| | Desktop | Mobile |
| --- | --- | --- |
| Sign in | ![Sign-in screen on desktop](docs/screenshots/login-desktop.png) | ![Sign-in screen on mobile](docs/screenshots/login-mobile.png) |
| Inventory (admin) | ![Admin inventory workspace on desktop](docs/screenshots/inventory-desktop.png) | ![Admin inventory workspace on mobile](docs/screenshots/inventory-mobile.png) |
| Sign in (dark) | ![Dark sign-in screen on desktop](docs/screenshots/login-dark-desktop.png) | ![Dark sign-in screen on mobile](docs/screenshots/login-dark-mobile.png) |
| Inventory (dark) | ![Dark admin inventory workspace on desktop](docs/screenshots/inventory-dark-desktop.png) | ![Dark admin inventory workspace on mobile](docs/screenshots/inventory-dark-mobile.png) |

## My AI Usage

The backend AI-assisted work is recorded in [PROMPTS.md](PROMPTS.md). **OpenAI Codex** built the frontend, including the API client, React components, tests, responsive styles and SVG artwork. **Claude Code** assisted with a final browser rerun and dialog focus regression test. Tests were executed against both an HTTP boundary double (component tests) and the real FastAPI/PostgreSQL stack (browser tests).

Frontend commits include `Co-authored-by: Codex <codex@openai.com>`. Git author identity is preserved. The local `FRONTEND_PROGRESS.md` handoff is deliberately gitignored and is not part of the submitted repository.

Implementation references: [Vite setup](https://vite.dev/guide/), [Tailwind’s Vite integration](https://tailwindcss.com/docs/installation/using-vite), and [Vitest setup](https://vitest.dev/guide/).
