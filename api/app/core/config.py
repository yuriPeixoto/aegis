from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings

_ENV_FILE = Path(__file__).parent.parent.parent / ".env"


class Settings(BaseSettings):
    # Application
    app_name: str = "Aegis"
    debug: bool = False

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/aegis"

    # File uploads
    upload_dir: str = "uploads"
    upload_max_size_mb: int = 10

    # JWT
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480  # 8 hours

    model_config = {
        "env_prefix": "AEGIS_",
        "env_file": str(_ENV_FILE),
        "env_file_encoding": "utf-8",
    }


settings = Settings()
