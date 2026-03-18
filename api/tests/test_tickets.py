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
    resp = await client.post(
        "/v1/sources",
        json={"name": "Ticket Read Test Source", "slug": unique_slug()},
    )
    assert resp.status_code == 201
    return resp.json()


@pytest.fixture
async def ingested_ticket(client: AsyncClient, source_with_key: dict) -> dict:
    """Ingest a ticket and return {ticket_id, external_id, api_key, source_id}."""
    external_id = unique_external_id()
    resp = await client.post(
        "/v1/ingest/tickets",
        headers={"X-Aegis-Key": source_with_key["api_key"]},
        json={
            "external_id": external_id,
            "type": "bug",
            "priority": "high",
            "status": "open",
            "subject": "Vehicle checkout crash",
            "description": "Crash when submitting form.",
        },
    )
    assert resp.status_code == 200
    return {
        "ticket_id": resp.json()["ticket_id"],
        "external_id": external_id,
        "api_key": source_with_key["api_key"],
        "source_id": source_with_key["id"],
    }


@pytest.mark.asyncio
async def test_list_tickets(client: AsyncClient, ingested_ticket: dict) -> None:
    response = await client.get("/v1/tickets")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_list_tickets_filter_by_source(client: AsyncClient, ingested_ticket: dict) -> None:
    response = await client.get("/v1/tickets", params={"source_id": ingested_ticket["source_id"]})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    for item in data["items"]:
        assert item["source_id"] == ingested_ticket["source_id"]


@pytest.mark.asyncio
async def test_list_tickets_filter_by_status(client: AsyncClient, ingested_ticket: dict) -> None:
    response = await client.get("/v1/tickets", params={"status": "open"})
    assert response.status_code == 200
    for item in response.json()["items"]:
        assert item["status"] == "open"


@pytest.mark.asyncio
async def test_get_ticket_detail(client: AsyncClient, ingested_ticket: dict) -> None:
    response = await client.get(f"/v1/tickets/{ingested_ticket['ticket_id']}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == ingested_ticket["ticket_id"]
    assert data["external_id"] == ingested_ticket["external_id"]
    assert "events" in data
    assert len(data["events"]) >= 1
    assert data["events"][0]["event_type"] == "created"


@pytest.mark.asyncio
async def test_get_ticket_not_found(client: AsyncClient) -> None:
    response = await client.get("/v1/tickets/999999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_tickets_pagination(client: AsyncClient, ingested_ticket: dict) -> None:
    response = await client.get("/v1/tickets", params={"limit": 1, "offset": 0})
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) <= 1
    assert data["limit"] == 1
