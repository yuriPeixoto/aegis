from __future__ import annotations

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import settings
from app.routers import ingest, sources, tickets

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


app.include_router(sources.router)
app.include_router(ingest.router)
app.include_router(tickets.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "healthy"}
