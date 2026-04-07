from __future__ import annotations

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.routers import (
    analytics,
    attachments,
    auth,
    canned_responses,
    dashboard,
    escalation,
    ingest,
    messages,
    notifications,
    sources,
    tags,
    tickets,
    users,
    views,
)
from app.routers import settings as settings_router

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    logger.info("app: starting up")
    avatar_dir = Path(settings.upload_dir) / "avatars"
    avatar_dir.mkdir(parents=True, exist_ok=True)
    app.mount(
        "/media/avatars",
        StaticFiles(directory=str(avatar_dir)),
        name="avatars",
    )
    yield
    logger.info("app: shutting down")


app = FastAPI(
    title="Aegis API",
    description="Centralized ticket & incident management",
    version="0.1.0",
    lifespan=lifespan,
)


app.include_router(auth.router)
app.include_router(analytics.router)
app.include_router(sources.router)
app.include_router(ingest.router)
app.include_router(tickets.router)
app.include_router(tags.router)
app.include_router(users.router)
app.include_router(messages.router)
app.include_router(notifications.router)
app.include_router(canned_responses.router)
app.include_router(attachments.router)
app.include_router(dashboard.router)
app.include_router(escalation.router)
app.include_router(views.router)
app.include_router(settings_router.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "healthy"}
