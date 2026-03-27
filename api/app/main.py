from __future__ import annotations

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import settings
from app.routers import (
    attachments,
    auth,
    canned_responses,
    dashboard,
    ingest,
    messages,
    notes,
    sources,
    tags,
    tickets,
    users,
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
    yield
    logger.info("app: shutting down")


app = FastAPI(
    title="Aegis API",
    description="Centralized ticket & incident management",
    version="0.1.0",
    lifespan=lifespan,
)


app.include_router(auth.router)
app.include_router(sources.router)
app.include_router(ingest.router)
app.include_router(tickets.router)
app.include_router(tags.router)
app.include_router(users.router)
app.include_router(notes.router)
app.include_router(messages.router)
app.include_router(canned_responses.router)
app.include_router(attachments.router)
app.include_router(dashboard.router)
app.include_router(settings_router.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "healthy"}
