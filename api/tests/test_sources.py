from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient


def unique_slug(prefix: str = "test") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


@pytest.mark.asyncio
async def test_create_source(client: AsyncClient) -> None:
    slug = unique_slug("gestao-frota")
    response = await client.post(
        "/v1/sources",
        json={"name": "gestao frota Cliente A", "slug": slug},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["slug"] == slug
    assert "api_key" in data
    assert len(data["api_key"]) > 20


@pytest.mark.asyncio
async def test_create_source_duplicate_slug(client: AsyncClient) -> None:
    slug = unique_slug("source")
    payload = {"name": "Source X", "slug": slug}
    r1 = await client.post("/v1/sources", json=payload)
    assert r1.status_code == 201
    r2 = await client.post("/v1/sources", json=payload)
    assert r2.status_code == 409


@pytest.mark.asyncio
async def test_list_sources(client: AsyncClient) -> None:
    await client.post("/v1/sources", json={"name": "Source A", "slug": unique_slug("a")})
    await client.post("/v1/sources", json={"name": "Source B", "slug": unique_slug("b")})
    response = await client.get("/v1/sources")
    assert response.status_code == 200
    assert len(response.json()) >= 2


@pytest.mark.asyncio
async def test_ingest_requires_api_key(client: AsyncClient) -> None:
    response = await client.post("/v1/ingest/tickets", json={})
    assert response.status_code in (401, 404)
