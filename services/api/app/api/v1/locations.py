"""Read-only workforce locations for assignment forms."""

from fastapi import APIRouter, Depends

from app.api.dependencies import require_workforce
from app.core.auth import Workforce
from app.infrastructure.database import trusted_connection

router = APIRouter(prefix="/v1/locations", tags=["locations"])


@router.get("")
def list_locations(workforce: Workforce = Depends(require_workforce)) -> dict[str, list[dict[str, object]]]:
    with trusted_connection(workforce.identity) as conn:
        salons = conn.execute("select id, code, name, is_active from public.salons order by code").fetchall()
        workshops = conn.execute("select id, code, name, is_active from public.workshops order by code").fetchall()
    return {"salons": [dict(row) for row in salons], "workshops": [dict(row) for row in workshops]}
