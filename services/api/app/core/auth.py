"""Verified Supabase access tokens and reusable workforce authorization."""

import logging
from dataclasses import dataclass
from functools import lru_cache
from typing import Any
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, Request, status
from jwt import PyJWKClient

from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Identity:
    user_id: UUID
    aal: str
    claims: dict[str, Any]


@dataclass(frozen=True)
class Workforce:
    identity: Identity
    display_name: str
    roles: frozenset[str]
    salon_ids: frozenset[UUID]
    workshop_ids: frozenset[UUID]

    def can_access_salon(self, salon_id: UUID) -> bool:
        return ("OWNER" in self.roles and self.identity.aal == "aal2") or (
            "SELLER" in self.roles and salon_id in self.salon_ids
        )

    def can_access_workshop(self, workshop_id: UUID) -> bool:
        return ("OWNER" in self.roles and self.identity.aal == "aal2") or (
            "PRODUCTION" in self.roles and workshop_id in self.workshop_ids
        )


class TokenVerifier:
    def __init__(self, settings: Settings) -> None:
        self.issuer = f"{(settings.supabase_url or '').rstrip('/')}/auth/v1"
        self.audience = settings.jwt_audience
        self.keys = PyJWKClient(f"{self.issuer}/.well-known/jwks.json", cache_jwk_set=True, lifespan=300)

    def verify(self, token: str) -> Identity:
        try:
            key = self.keys.get_signing_key_from_jwt(token)
            claims: dict[str, Any] = jwt.decode(
                token,
                key.key,
                algorithms=["ES256", "RS256"],
                audience=self.audience,
                issuer=self.issuer,
                options={"require": ["sub", "exp", "iat", "iss", "aud", "role", "session_id"]},
            )
            if claims.get("role") != "authenticated" or claims.get("is_anonymous") is True:
                raise ValueError("not a workforce token")
            return Identity(user_id=UUID(claims["sub"]), aal=claims.get("aal", "aal1"), claims=claims)
        except (jwt.PyJWTError, ValueError, TypeError, KeyError) as exc:
            logger.warning("Supabase access token rejected: %s", type(exc).__name__)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid access token",
                headers={"WWW-Authenticate": "Bearer"},
            ) from exc


@lru_cache
def get_token_verifier() -> TokenVerifier:
    settings = get_settings()
    if not settings.supabase_url:
        raise HTTPException(status_code=503, detail="Authentication is not configured")
    return TokenVerifier(settings)


def require_identity(request: Request, verifier: TokenVerifier = Depends(get_token_verifier)) -> Identity:
    scheme, _, token = request.headers.get("Authorization", "").partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Bearer token required", headers={"WWW-Authenticate": "Bearer"})
    return verifier.verify(token)


def require_owner(workforce: Workforce) -> Workforce:
    if "OWNER" not in workforce.roles:
        raise HTTPException(status_code=403, detail="OWNER role required")
    if workforce.identity.aal != "aal2":
        raise HTTPException(status_code=403, detail="OWNER MFA required")
    return workforce
