from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient


def unique_slug() -> str:
    return f"src-{uuid.uuid4().hex[:8]}"


def unique_external_id() -> str:
    return f"SUP-2026-{uuid.uuid4().hex[:6].upper()}"


@pytest.fixture
async def source_with_key(client: AsyncClient) -> dict:
    """Create a source and return its data including the plaintext API key."""
    resp = await client.post(
        "/v1/sources",
        json={"name": "Test Source", "slug": unique_slug()},
    )
    assert resp.status_code == 201
    return resp.json()


@pytest.mark.asyncio
async def test_ingest_ticket_created(client: AsyncClient, source_with_key: dict) -> None:
    external_id = unique_external_id()
    response = await client.post(
        "/v1/ingest/tickets",
        headers={"X-Aegis-Key": source_with_key["api_key"]},
        json={
            "external_id": external_id,
            "type": "bug",
            "priority": "high",
            "status": "open",
            "subject": "Error on vehicle checkout",
            "description": "Crash when submitting the form.",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["external_id"] == external_id
    assert data["created"] is True


@pytest.mark.asyncio
async def test_ingest_ticket_upsert(client: AsyncClient, source_with_key: dict) -> None:
    """Second ingest of the same external_id should update, not create."""
    external_id = unique_external_id()
    headers = {"X-Aegis-Key": source_with_key["api_key"]}
    payload = {
        "external_id": external_id,
        "type": "bug",
        "priority": "high",
        "status": "open",
        "subject": "Initial subject",
    }

    r1 = await client.post("/v1/ingest/tickets", headers=headers, json=payload)
    assert r1.json()["created"] is True

    payload["status"] = "in_progress"
    payload["subject"] = "Updated subject"
    r2 = await client.post("/v1/ingest/tickets", headers=headers, json=payload)
    assert r2.status_code == 200
    assert r2.json()["created"] is False
    assert r2.json()["ticket_id"] == r1.json()["ticket_id"]


@pytest.mark.asyncio
async def test_ingest_requires_valid_api_key(client: AsyncClient) -> None:
    response = await client.post(
        "/v1/ingest/tickets",
        headers={"X-Aegis-Key": "invalid-key"},
        json={
            "external_id": "SUP-2026-001",
            "status": "open",
            "subject": "Test",
        },
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_ingest_event(client: AsyncClient, source_with_key: dict) -> None:
    external_id = unique_external_id()
    headers = {"X-Aegis-Key": source_with_key["api_key"]}

    # Create the ticket first
    await client.post(
        "/v1/ingest/tickets",
        headers=headers,
        json={"external_id": external_id, "status": "open", "subject": "Test ticket"},
    )

    # Send a status change event
    response = await client.post(
        "/v1/ingest/tickets/events",
        headers=headers,
        json={
            "external_id": external_id,
            "event_type": "status_changed",
            "payload": {"from": "open", "to": "in_progress"},
        },
    )
    assert response.status_code == 201
    assert "event_id" in response.json()
