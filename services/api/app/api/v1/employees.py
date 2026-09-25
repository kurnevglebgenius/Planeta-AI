"""Minimal OWNER employee administration. Auth Admin never reaches the browser."""

from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr, Field, model_validator

from app.api.dependencies import require_owner_workforce
from app.core.auth import Workforce
from app.infrastructure.auth_admin import AuthAdmin, get_auth_admin
from app.infrastructure.workforce import WorkforceRepository, get_workforce_repository

router = APIRouter(prefix="/v1/employees", tags=["employees"])
Role = Literal["OWNER", "SELLER", "PRODUCTION"]


class AccessBody(BaseModel):
    roles: set[Role] = Field(min_length=1)
    salon_ids: set[UUID] = Field(default_factory=set)
    workshop_ids: set[UUID] = Field(default_factory=set)

    @model_validator(mode="after")
    def valid_combination(self) -> "AccessBody":
        if "PRODUCTION" in self.roles and len(self.roles) != 1:
            raise ValueError("PRODUCTION cannot be combined with another role")
        if self.salon_ids and "SELLER" not in self.roles:
            raise ValueError("Salon assignment requires SELLER")
        if self.workshop_ids and "PRODUCTION" not in self.roles:
            raise ValueError("Workshop assignment requires PRODUCTION")
        if "SELLER" in self.roles and not self.salon_ids:
            raise ValueError("SELLER requires at least one salon")
        if "PRODUCTION" in self.roles and not self.workshop_ids:
            raise ValueError("PRODUCTION requires at least one workshop")
        return self


class InviteBody(AccessBody):
    email: EmailStr
    display_name: str = Field(min_length=1, max_length=120)


class AccessUpdateBody(AccessBody):
    display_name: str | None = Field(default=None, min_length=1, max_length=120)


class StatusBody(BaseModel):
    is_active: bool


@router.get("")
def list_employees(
    owner: Workforce = Depends(require_owner_workforce),
    repository: WorkforceRepository = Depends(get_workforce_repository),
) -> list[dict[str, object]]:
    return repository.list_employees(owner.identity)


@router.post("", status_code=201)
def invite_employee(
    body: InviteBody,
    owner: Workforce = Depends(require_owner_workforce),
    repository: WorkforceRepository = Depends(get_workforce_repository),
    auth_admin: AuthAdmin = Depends(get_auth_admin),
) -> dict[str, UUID]:
    user_id = auth_admin.invite(str(body.email))
    try:
        repository.create_profile(
            owner.identity,
            user_id,
            body.display_name,
            set(body.roles),
            body.salon_ids,
            body.workshop_ids,
        )
    except Exception:
        # The just-created invite has no business profile; prevent an orphan login.
        auth_admin.delete_new_invite(user_id)
        raise
    return {"id": user_id}


@router.put("/{employee_id}/access", status_code=204)
def replace_access(
    employee_id: UUID,
    body: AccessUpdateBody,
    owner: Workforce = Depends(require_owner_workforce),
    repository: WorkforceRepository = Depends(get_workforce_repository),
) -> None:
    repository.replace_access(
        owner.identity,
        employee_id,
        body.display_name,
        set(body.roles),
        body.salon_ids,
        body.workshop_ids,
    )


@router.put("/{employee_id}/status", status_code=204)
def set_status(
    employee_id: UUID,
    body: StatusBody,
    owner: Workforce = Depends(require_owner_workforce),
    repository: WorkforceRepository = Depends(get_workforce_repository),
    auth_admin: AuthAdmin = Depends(get_auth_admin),
) -> None:
    repository.set_active(owner.identity, employee_id, body.is_active)
    # If Auth is temporarily unavailable, current profile state still denies
    # all protected reads. Operations must reconcile the Auth ban before success.
    auth_admin.set_disabled(employee_id, not body.is_active)
