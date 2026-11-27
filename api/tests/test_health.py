from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Any

import pytest
from httpx import AsyncClient

from app.core.database import get_db
from app.main import app


@pytest.mark.asyncio
async def test_health(client: AsyncClient) -> None:
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "dependencies": {"database": "ok"}}


class _BrokenSession:
    async def execute(self, *_args: Any, **_kwargs: Any) -> None:
        raise ConnectionRefusedError("connection to db.example:5432 refused")


@pytest.mark.asyncio
async def test_health_503_when_database_is_down(client: AsyncClient) -> None:
    async def _broken_db() -> AsyncGenerator[_BrokenSession]:
        yield _BrokenSession()

    previous = app.dependency_overrides[get_db]
    app.dependency_overrides[get_db] = _broken_db
    try:
        response = await client.get("/health")
    finally:
        app.dependency_overrides[get_db] = previous

    assert response.status_code == 503
    assert response.json() == {"status": "unhealthy", "dependencies": {"database": "down"}}
    assert "db.example" not in response.text
