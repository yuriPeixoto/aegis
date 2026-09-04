from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient


def unique_slug(prefix: str = "test") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


@pytest.mark.asyncio
async def test_create_source(admin_client: AsyncClient) -> None:
    slug = unique_slug("gestao-frota")
    response = await admin_client.post(
        "/v1/sources",
        json={"name": "gestao frota Cliente A", "slug": slug},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["slug"] == slug
    assert "api_key" in data
    assert len(data["api_key"]) > 20


@pytest.mark.asyncio
async def test_create_source_duplicate_slug(admin_client: AsyncClient) -> None:
    slug = unique_slug("source")
    payload = {"name": "Source X", "slug": slug}
    r1 = await admin_client.post("/v1/sources", json=payload)
    assert r1.status_code == 201
    r2 = await admin_client.post("/v1/sources", json=payload)
    assert r2.status_code == 409


@pytest.mark.asyncio
async def test_list_sources(admin_client: AsyncClient) -> None:
    await admin_client.post("/v1/sources", json={"name": "Source A", "slug": unique_slug("a")})
    await admin_client.post("/v1/sources", json={"name": "Source B", "slug": unique_slug("b")})
    response = await admin_client.get("/v1/sources")
    assert response.status_code == 200
    assert len(response.json()) >= 2


@pytest.mark.asyncio
async def test_ingest_requires_api_key(client: AsyncClient) -> None:
    response = await client.post("/v1/ingest/tickets", json={})
    assert response.status_code in (401, 404)


@pytest.mark.asyncio
async def test_upload_source_logo(admin_client: AsyncClient) -> None:
    create = await admin_client.post(
        "/v1/sources", json={"name": "Logo Source", "slug": unique_slug("logo")}
    )
    source_id = create.json()["id"]

    png_bytes = bytes.fromhex(
        "89504e470d0a1a0a0000000d49484452000000010000000108020000009077"
        "53de0000000c4944415408d76360000000020001e221bc330000000049454e44ae426082"
    )
    response = await admin_client.post(
        f"/v1/sources/{source_id}/logo",
        files={"logo": ("logo.png", png_bytes, "image/png")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["logo"] is not None

    listed = await admin_client.get("/v1/sources")
    match = next(s for s in listed.json() if s["id"] == source_id)
    assert match["logo"] == data["logo"]


@pytest.mark.asyncio
async def test_upload_source_logo_rejects_bad_content_type(admin_client: AsyncClient) -> None:
    create = await admin_client.post(
        "/v1/sources", json={"name": "Bad Logo Source", "slug": unique_slug("badlogo")}
    )
    source_id = create.json()["id"]

    response = await admin_client.post(
        f"/v1/sources/{source_id}/logo",
        files={"logo": ("logo.txt", b"not an image", "text/plain")},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_upload_source_logo_requires_admin(client: AsyncClient) -> None:
    response = await client.post(
        "/v1/sources/1/logo",
        files={"logo": ("logo.png", b"\x89PNG", "image/png")},
    )
    assert response.status_code in (401, 403)
