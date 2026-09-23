"""Foundation checks with no external services."""

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.config import Settings
from app.main import create_app


def test_health_is_available_without_credentials() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_environment_rejects_unknown_value() -> None:
    with pytest.raises(ValidationError):
        Settings(app_env="unknown")  # type: ignore[arg-type]
