"""New Supabase secret keys must never be sent as bearer JWTs."""

from types import SimpleNamespace

import httpx
import pytest
from pydantic import SecretStr

from app.infrastructure import auth_admin


def test_secret_key_is_sent_only_as_apikey(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: dict[str, object] = {}

    def fake_request(method: str, url: str, **kwargs: object) -> httpx.Response:
        seen.update(kwargs)
        return httpx.Response(200, json={"users": []}, request=httpx.Request(method, url))

    settings = SimpleNamespace(
        supabase_url="https://example.supabase.co",
        supabase_secret_key=SecretStr("sb_secret_example"),
    )
    monkeypatch.setattr(auth_admin, "get_settings", lambda: settings)
    monkeypatch.setattr(httpx, "request", fake_request)

    assert auth_admin.AuthAdmin()._request("GET", "admin/users") == {"users": []}
    assert seen["headers"] == {"apikey": "sb_secret_example"}
