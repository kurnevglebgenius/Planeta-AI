"""Request-time identity, active-profile, and OWNER assurance checks."""

from fastapi import Depends, HTTPException

from app.core.auth import Identity, Workforce, require_identity, require_owner
from app.infrastructure.workforce import WorkforceRepository, get_workforce_repository


def require_workforce(
    identity: Identity = Depends(require_identity),
    repository: WorkforceRepository = Depends(get_workforce_repository),
) -> Workforce:
    workforce = repository.load(identity)
    if workforce is None:
        raise HTTPException(status_code=403, detail="Active workforce profile required")
    return workforce


def require_owner_workforce(workforce: Workforce = Depends(require_workforce)) -> Workforce:
    return require_owner(workforce)
