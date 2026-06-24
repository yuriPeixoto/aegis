from __future__ import annotations

from fastapi import APIRouter

from app.core.changelog import APP_CHANGELOG
from app.core.config import settings

router = APIRouter(tags=["about"])


@router.get("/v1/about")
async def about() -> dict:
    return {
        "version": settings.app_version,
        "build_date": settings.build_date,
        "env": "development" if settings.debug else "production",
        "github_url": settings.github_url,
        "changelog": APP_CHANGELOG,
    }
