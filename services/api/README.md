# API foundation

Python 3.12+ and FastAPI. Only `GET /health` is exposed. Business routes, Auth, database adapters and workers are reserved for later steps.

From `services/api`, create a virtual environment and install the pinned project dependencies:

```powershell
python -m venv .venv
.venv/Scripts/python -m pip install -e ".[dev]"
.venv/Scripts/python -m ruff check app tests
.venv/Scripts/python -m ruff format --check app tests
.venv/Scripts/python -m mypy
.venv/Scripts/python -m pytest
.venv/Scripts/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Configuration uses `APP_ENV`, defaulting to `local`; copy `.env.example` to `.env` only for local overrides. No secret or Supabase connection is needed for foundation checks.
