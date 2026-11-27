from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.core.config import settings
from app.core.dependencies import DbSession
from app.routers import (
    about,
    analytics,
    attachments,
    auth,
    calendar,
    canned_responses,
    checklist,
    clientes,
    dashboard,
    escalation,
    ingest,
    messages,
    modulos,
    notes,
    notifications,
    sources,
    tags,
    tickets,
    training_records,
    users,
    views,
)
from app.routers import settings as settings_router
from app.services import (
    ticket_sync_hooks,  # noqa: F401 — import registers the SQLAlchemy status-change hook (Aegis #1436/#1437)
)

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
    logo_dir = Path(settings.upload_dir) / "logos"
    logo_dir.mkdir(parents=True, exist_ok=True)
    app.mount(
        "/media/logos",
        StaticFiles(directory=str(logo_dir)),
        name="logos",
    )
    yield
    logger.info("app: shutting down")


app = FastAPI(
    title="Aegis API",
    description="Centralized ticket & incident management",
    version=settings.app_version,
    lifespan=lifespan,
)


app.include_router(about.router)
app.include_router(auth.router)
app.include_router(analytics.router)
app.include_router(calendar.router)
app.include_router(sources.router)
app.include_router(clientes.router)
app.include_router(modulos.router)
app.include_router(ingest.router)
app.include_router(tickets.router)
app.include_router(checklist.router)
app.include_router(tags.router)
app.include_router(users.router)
app.include_router(messages.router)
app.include_router(notes.router)
app.include_router(notifications.router)
app.include_router(canned_responses.router)
app.include_router(attachments.router)
app.include_router(dashboard.router)
app.include_router(escalation.router)
app.include_router(views.router)
app.include_router(settings_router.router)
app.include_router(training_records.router)
app.include_router(training_records.public_router)


_HEALTH_DB_TIMEOUT_SECONDS = 2.0


@app.get("/health")
async def health(db: DbSession) -> JSONResponse:
    """Liveness for monitors (the Maestro watchdog): no login, 503 when the database
    does not answer. Deliberately says nothing beyond up/down."""
    try:
        async with asyncio.timeout(_HEALTH_DB_TIMEOUT_SECONDS):
            await db.execute(text("SELECT 1"))
    except Exception:
        logger.exception("health: database check failed")
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "dependencies": {"database": "down"}},
        )
    return JSONResponse(content={"status": "healthy", "dependencies": {"database": "ok"}})
