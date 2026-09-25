"""Every API error remains structured, including unexpected failures."""

from uuid import UUID

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app import main
from app.core.auth import Identity, Workforce, get_token_verifier
from app.core.config import Settings
from app.infrastructure.workforce import get_workforce_repository
from app.main import create_app

USER = UUID("00000000-0000-0000-0000-000000000401")


class FakeVerifier:
    def verify(self, token: str) -> Identity:
        return Identity(USER, "aal1", {"sub": str(USER), "aal": "aal1"})


class FakeRepository:
    def load(self, identity: Identity) -> Workforce:
        return Workforce(identity, "Fixture", frozenset({"SELLER"}), frozenset(), frozenset())


def test_http_and_validation_errors_share_envelope() -> None:
    app = create_app()
    app.dependency_overrides[get_token_verifier] = FakeVerifier
    app.dependency_overrides[get_workforce_repository] = FakeRepository
    with TestClient(app) as client:
        unauthorized = client.get("/v1/me")
        forbidden = client.get("/v1/employees", headers={"Authorization": "Bearer fixture"})
        missing = client.get("/v1/missing")
        invalid = client.get("/v1/files/not-a-uuid", headers={"Authorization": "Bearer fixture"})
    assert unauthorized.status_code == 401
    assert unauthorized.json()["error"]["code"] == "unauthorized"
    assert unauthorized.headers["www-authenticate"] == "Bearer"
    assert forbidden.status_code == 403
    assert forbidden.json()["error"]["code"] == "forbidden"
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "not_found"
    assert invalid.status_code == 422
    assert invalid.json()["error"]["code"] == "invalid_request"
    for response in (unauthorized, forbidden, missing, invalid):
        assert isinstance(response.json()["error"]["message"], str)


def test_unexpected_error_is_json_with_cors(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(main, "get_settings", lambda: Settings(web_origin="http://localhost:3000"))
    app = create_app()

    @app.get("/test-crash")
    def crash() -> None:
        raise RuntimeError("do not disclose this internal detail")

    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.get("/test-crash", headers={"Origin": "http://localhost:3000"})
    assert response.status_code == 500
    assert response.json() == {"error": {"code": "internal_error", "message": "Internal server error"}}
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_last_owner_conflict_has_stable_code() -> None:
    app = create_app()

    @app.get("/test-conflict")
    def conflict() -> None:
        raise HTTPException(status_code=409, detail="Last OWNER or assignment guard")

    with TestClient(app) as client:
        response = client.get("/test-conflict")
    assert response.json() == {"error": {"code": "last_owner_guard", "message": "Last OWNER or assignment guard"}}
