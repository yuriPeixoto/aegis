from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings

_ENV_FILE = Path(__file__).parent.parent.parent / ".env"


class Settings(BaseSettings):
    # Application
    app_name: str = "Aegis"
    app_version: str = "1.5.1"
    build_date: str = "2026-09-03"
    github_url: str = "https://github.com/yuriPeixoto/aegis"
    debug: bool = False

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/aegis"

    # File uploads
    upload_dir: str = "uploads"
    upload_max_size_mb: int = 10

    # JWT
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    # Was 480 (8h) — a login at 08:30 expired at 16:30, right in the middle of
    # the 13:00-17:30 work block, causing an unexplained mid-shift logout.
    # 720 (12h) comfortably covers a full 08:30-17:30 day (9h span incl. lunch)
    # plus slack for early logins/late work, without introducing sliding-session
    # refresh logic in this hotfix.
    access_token_expire_minutes: int = 720  # 12 hours

    model_config = {
        "env_prefix": "AEGIS_",
        "env_file": str(_ENV_FILE),
        "env_file_encoding": "utf-8",
    }


settings = Settings()
