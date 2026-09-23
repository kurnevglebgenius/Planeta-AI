"""Validated non-secret environment settings for the foundation."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="forbid")

    app_env: Literal["local", "development", "test", "production"] = "local"


@lru_cache
def get_settings() -> Settings:
    return Settings()
