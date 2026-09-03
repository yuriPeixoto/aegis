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
    """Create a source and return its data including the plaintext API key."""
    resp = await admin_client.post(
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


@pytest.mark.asyncio
async def test_ingest_critical_source_tags_and_notifies_once(
    client: AsyncClient,
    admin_client: AsyncClient,
    agent_client: AsyncClient,
    agent_user: dict,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A ticket created by a source registered in _CRITICAL_SOURCE_ALERTS (e.g. Log
    Watcher, #1271) gets the tag auto-applied and a blocking 'critical_source'
    notification sent to the mapped recipient — only on creation, not on upsert."""
    from app.services import ingest_service

    monkeypatch.setitem(
        ingest_service._CRITICAL_SOURCE_ALERTS,
        "log-watcher-test",
        ("Log Watcher", agent_user["email"]),
    )

    source_resp = await admin_client.post(
        "/v1/sources", json={"name": "Log Watcher", "slug": "log-watcher-test"}
    )
    assert source_resp.status_code == 201
    source = source_resp.json()

    external_id = unique_external_id()
    ingest_resp = await client.post(
        "/v1/ingest/tickets",
        headers={"X-Aegis-Key": source["api_key"]},
        json={"external_id": external_id, "status": "open", "subject": "Falha real em produção"},
    )
    assert ingest_resp.status_code == 200
    ticket_id = ingest_resp.json()["ticket_id"]

    ticket_resp = await admin_client.get(f"/v1/tickets/{ticket_id}")
    tag_names = {t["name"] for t in ticket_resp.json()["tags"]}
    assert "Log Watcher" in tag_names

    notif_resp = await agent_client.get("/v1/me/notifications", params={"unread_only": "true"})
    notifications = notif_resp.json()
    critical = [n for n in notifications if n["type"] == "critical_source"]
    assert len(critical) == 1
    assert critical[0]["ticket_id"] == ticket_id
    assert critical[0]["actor_name"] == "Log Watcher"

    # Upsert (same external_id) must not fire a second notification
    await client.post(
        "/v1/ingest/tickets",
        headers={"X-Aegis-Key": source["api_key"]},
        json={
            "external_id": external_id,
            "status": "in_progress",
            "subject": "Falha real em produção",
        },
    )
    notif_resp_2 = await agent_client.get("/v1/me/notifications", params={"unread_only": "true"})
    critical_2 = [n for n in notif_resp_2.json() if n["type"] == "critical_source"]
    assert len(critical_2) == 1


@pytest.mark.asyncio
async def test_ingest_event_status_changed_stores_gf_ambiguous_substatus(
    client: AsyncClient, admin_client: AsyncClient, source_with_key: dict
) -> None:
    """aguardando_cliente and aguardando_validacao_cliente both map to Aegis's
    'pending_closure' (ADR-003) — the raw GF status must be kept in source_metadata
    so the frontend can tell the two apart. See docs/adr/003-enum-normalization-strategy.md."""
    external_id = unique_external_id()
    headers = {"X-Aegis-Key": source_with_key["api_key"]}

    create_resp = await client.post(
        "/v1/ingest/tickets",
        headers=headers,
        json={"external_id": external_id, "status": "in_progress", "subject": "Test ticket"},
    )
    ticket_id = create_resp.json()["ticket_id"]

    response = await client.post(
        "/v1/ingest/tickets/events",
        headers=headers,
        json={
            "external_id": external_id,
            "event_type": "status_changed",
            "payload": {"status": "aguardando_validacao_cliente"},
        },
    )
    assert response.status_code == 201

    ticket_resp = await admin_client.get(f"/v1/tickets/{ticket_id}")
    ticket = ticket_resp.json()
    assert ticket["status"] == "pending_closure"
    assert ticket["source_metadata"]["gf_status_raw"] == "aguardando_validacao_cliente"
