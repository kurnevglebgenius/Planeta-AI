"""Authenticated session profile and one-time MFA bootstrap completion."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.dependencies import require_workforce
from app.core.auth import Identity, Workforce, require_identity
from app.infrastructure.workforce import WorkforceRepository, get_workforce_repository

router = APIRouter(prefix="/v1", tags=["session"])


class MeResponse(BaseModel):
    id: UUID
    display_name: str
    roles: list[str]
    salon_ids: list[UUID]
    workshop_ids: list[UUID]
    owner_mfa_verified: bool


@router.get("/me", response_model=MeResponse)
def me(workforce: Workforce = Depends(require_workforce)) -> MeResponse:
    return MeResponse(
        id=workforce.identity.user_id,
        display_name=workforce.display_name,
        roles=sorted(workforce.roles),
        salon_ids=sorted(workforce.salon_ids),
        workshop_ids=sorted(workforce.workshop_ids),
        owner_mfa_verified="OWNER" in workforce.roles and workforce.identity.aal == "aal2",
    )


@router.post("/bootstrap/activate", status_code=204)
def activate_initial_owner(
    identity: Identity = Depends(require_identity),
    repository: WorkforceRepository = Depends(get_workforce_repository),
) -> None:
    if identity.aal != "aal2" or not repository.activate_initial_owner(identity):
        raise HTTPException(status_code=403, detail="Initial OWNER MFA verification required")
