from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient


def unique_slug() -> str:
    return f"src-{uuid.uuid4().hex[:8]}"


def unique_external_id() -> str:
    return f"SUP-2026-{uuid.uuid4().hex[:6].upper()}"


@pytest.fixture
async def source_with_key(admin_client: AsyncClient) -> dict:
    resp = await admin_client.post(
        "/v1/sources",
        json={"name": "Checklist Test Source", "slug": unique_slug()},
    )
    assert resp.status_code == 201
    return resp.json()


@pytest.fixture
async def ingested_ticket(client: AsyncClient, source_with_key: dict) -> dict:
    resp = await client.post(
        "/v1/ingest/tickets",
        headers={"X-Aegis-Key": source_with_key["api_key"]},
        json={
            "external_id": unique_external_id(),
            "type": "bug",
            "priority": "high",
            "status": "open",
            "subject": "Ticket with checklist",
        },
    )
    assert resp.status_code == 200
    return resp.json()


@pytest.mark.asyncio
async def test_create_checklist_item(
    admin_client: AsyncClient, ingested_ticket: dict
) -> None:
    ticket_id = ingested_ticket["ticket_id"]
    resp = await admin_client.post(
        f"/v1/tickets/{ticket_id}/checklist", json={"text": "Ajustar migration"}
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["text"] == "Ajustar migration"
    assert data["is_done"] is False
    assert data["position"] == 0

    detail = await admin_client.get(f"/v1/tickets/{ticket_id}")
    body = detail.json()
    assert body["checklist_progress"] == {"done": 0, "total": 1}
    assert len(body["checklist_items"]) == 1


@pytest.mark.asyncio
async def test_toggle_checklist_item_updates_progress(
    admin_client: AsyncClient, ingested_ticket: dict
) -> None:
    ticket_id = ingested_ticket["ticket_id"]
    item = (
        await admin_client.post(
            f"/v1/tickets/{ticket_id}/checklist", json={"text": "Escrever testes"}
        )
    ).json()

    toggled = await admin_client.patch(
        f"/v1/tickets/{ticket_id}/checklist/{item['id']}", json={"is_done": True}
    )
    assert toggled.status_code == 200
    assert toggled.json()["is_done"] is True
    assert toggled.json()["done_at"] is not None

    detail = (await admin_client.get(f"/v1/tickets/{ticket_id}")).json()
    assert detail["checklist_progress"] == {"done": 1, "total": 1}


@pytest.mark.asyncio
async def test_delete_checklist_item(
    admin_client: AsyncClient, ingested_ticket: dict
) -> None:
    ticket_id = ingested_ticket["ticket_id"]
    item = (
        await admin_client.post(
            f"/v1/tickets/{ticket_id}/checklist", json={"text": "Item removível"}
        )
    ).json()

    deleted = await admin_client.delete(f"/v1/tickets/{ticket_id}/checklist/{item['id']}")
    assert deleted.status_code == 204

    detail = (await admin_client.get(f"/v1/tickets/{ticket_id}")).json()
    assert detail["checklist_progress"] == {"done": 0, "total": 0}


@pytest.mark.asyncio
async def test_checklist_item_not_found(
    admin_client: AsyncClient, ingested_ticket: dict
) -> None:
    ticket_id = ingested_ticket["ticket_id"]
    resp = await admin_client.patch(
        f"/v1/tickets/{ticket_id}/checklist/999999", json={"is_done": True}
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_ingest_with_checklist_items_creates_items(
    client: AsyncClient, source_with_key: dict, admin_client: AsyncClient
) -> None:
    external_id = unique_external_id()
    resp = await client.post(
        "/v1/ingest/tickets",
        headers={"X-Aegis-Key": source_with_key["api_key"]},
        json={
            "external_id": external_id,
            "status": "open",
            "subject": "Ticket pre-quebrado pelo cliente",
            "checklist_items": ["Passo 1", "Passo 2", ""],
        },
    )
    assert resp.status_code == 200
    ticket_id = resp.json()["ticket_id"]

    detail = (await admin_client.get(f"/v1/tickets/{ticket_id}")).json()
    assert detail["checklist_progress"] == {"done": 0, "total": 2}
    texts = [i["text"] for i in detail["checklist_items"]]
    assert texts == ["Passo 1", "Passo 2"]
