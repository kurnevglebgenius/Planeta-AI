"""Environment settings. Secret values are accepted only by the API process."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="forbid")

    app_env: Literal["local", "development", "test", "production"] = "local"
    supabase_url: str | None = None
    supabase_publishable_key: str | None = None
    supabase_secret_key: SecretStr | None = None
    database_url: SecretStr | None = None
    jwt_audience: str = "authenticated"
    web_origin: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
