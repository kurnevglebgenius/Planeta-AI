# FastAPI Auth foundation

Python 3.12+. `GET /health` remains public. `/v1/me`, `/v1/bootstrap/activate`,
`/v1/employees`, and `/v1/files/{id}` require a verified Supabase JWT.
Employee administration requires an active OWNER with `aal2`. The file route is
a guarded placeholder and always returns 404 until the order-file domain exists.

From `services/api`:

```powershell
python -m venv .venv
.venv/Scripts/python -m pip install -e ".[dev]"
.venv/Scripts/python -m ruff check app tests tools
.venv/Scripts/python -m ruff format --check app tests tools
.venv/Scripts/python -m mypy app tests tools
.venv/Scripts/python -m pytest -q
.venv/Scripts/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Copy `.env.example` to an ignored `.env` and supply development values via a
secret manager. `SUPABASE_SECRET_KEY` is used only for Auth Admin invite/ban;
`DATABASE_URL` is a dedicated SQL login that assumes `planeta_api` per transaction.
No secret is needed for local unit tests or the health endpoint. The live API
fails closed if an Auth or database dependency is absent.

See [operations](../../docs/operations/README.md) for Auth project configuration,
initial OWNER staging, and deployment prerequisites.
