"""Sensitive original boundary; file resource authorization arrives with orders."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import require_workforce
from app.core.auth import Workforce

router = APIRouter(prefix="/v1/files", tags=["files"])


@router.get("/{file_id}")
def file_gateway(file_id: UUID, workforce: Workforce = Depends(require_workforce)) -> None:
    # A new active-profile check runs on every call. No Storage URL is returned.
    # The order-file module will add resource authorization and byte streaming.
    raise HTTPException(status_code=404, detail="File unavailable")
