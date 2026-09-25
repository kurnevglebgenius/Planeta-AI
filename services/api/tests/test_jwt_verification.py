"""JWT signature, project issuer/audience, expiry, and JWKS rotation."""

from datetime import UTC, datetime, timedelta
from json import loads
from typing import cast
from uuid import UUID

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import HTTPException

from app.core.auth import TokenVerifier
from app.core.config import Settings

USER = UUID("00000000-0000-0000-0000-000000000321")
ISSUER = "https://example.supabase.co/auth/v1"


def signed_token(key: ec.EllipticCurvePrivateKey, kid: str, **overrides: object) -> str:
    now = datetime.now(UTC)
    claims: dict[str, object] = {
        "sub": str(USER),
        "role": "authenticated",
        "aud": "authenticated",
        "iss": ISSUER,
        "iat": now,
        "exp": now + timedelta(minutes=5),
        "session_id": str(UUID("00000000-0000-0000-0000-000000000322")),
        "aal": "aal2",
    }
    claims.update(overrides)
    return jwt.encode(claims, key, algorithm="ES256", headers={"kid": kid})


def public_jwk(key: ec.EllipticCurvePrivateKey, kid: str) -> dict[str, object]:
    result = cast(dict[str, object], loads(jwt.algorithms.ECAlgorithm.to_jwk(key.public_key())))
    result["kid"] = kid
    result["alg"] = "ES256"
    return result


def test_verified_jwt_and_rotated_jwks(monkeypatch: pytest.MonkeyPatch) -> None:
    old_key = ec.generate_private_key(ec.SECP256R1())
    new_key = ec.generate_private_key(ec.SECP256R1())
    verifier = TokenVerifier(Settings(supabase_url="https://example.supabase.co"))
    keys = {"keys": [public_jwk(old_key, "old")]}
    monkeypatch.setattr(verifier.keys, "fetch_data", lambda: keys)
    assert verifier.verify(signed_token(old_key, "old")).user_id == USER
    keys = {"keys": [public_jwk(new_key, "new")]}
    assert verifier.verify(signed_token(new_key, "new")).aal == "aal2"

    for token in (
        signed_token(new_key, "new", aud="wrong"),
        signed_token(new_key, "new", iss="https://other.supabase.co/auth/v1"),
        signed_token(new_key, "new", exp=datetime.now(UTC) - timedelta(seconds=1)),
        signed_token(new_key, "new", role="anon"),
        signed_token(old_key, "unknown"),
    ):
        with pytest.raises(HTTPException) as exc:
            verifier.verify(token)
        assert exc.value.status_code == 401
