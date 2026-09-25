"""Supabase Auth Admin calls, isolated from routine database access."""

from uuid import UUID

import httpx
from fastapi import HTTPException

from app.core.config import get_settings


class AuthAdmin:
    def _request(self, method: str, path: str, payload: dict[str, str] | None = None) -> dict:  # type: ignore[type-arg]
        settings = get_settings()
        if not settings.supabase_url or settings.supabase_secret_key is None:
            raise HTTPException(status_code=503, detail="Auth administration is not configured")
        secret = settings.supabase_secret_key.get_secret_value()
        try:
            response = httpx.request(
                method,
                f"{settings.supabase_url.rstrip('/')}/auth/v1/{path}",
                headers={"apikey": secret},
                json=payload,
                timeout=10.0,
            )
            response.raise_for_status()
            return response.json() if response.content else {}
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=503, detail="Auth administration unavailable") from exc

    def invite(self, email: str) -> UUID:
        result = self._request("POST", "invite", {"email": email})
        return UUID(result["id"])

    def set_disabled(self, user_id: UUID, disabled: bool) -> None:
        self._request(
            "PUT",
            f"admin/users/{user_id}",
            {"ban_duration": "876000h" if disabled else "none"},
        )

    def delete_new_invite(self, user_id: UUID) -> None:
        self._request("DELETE", f"admin/users/{user_id}")


def get_auth_admin() -> AuthAdmin:
    return AuthAdmin()
