from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient


def unique_slug() -> str:
    return f"cal-src-{uuid.uuid4().hex[:8]}"


@pytest.fixture
async def source_with_key(admin_client: AsyncClient) -> dict:
    resp = await admin_client.post(
        "/v1/sources",
        json={"name": "Calendar Test Source", "slug": unique_slug()},
    )
    assert resp.status_code == 201
    return resp.json()


@pytest.mark.asyncio
async def test_create_task_event_requires_title(
    admin_client: AsyncClient, admin_user: dict
) -> None:
    resp = await admin_client.post(
        "/v1/calendar/events",
        json={
            "type": "task",
            "agent_id": admin_user["id"],
            "event_date": "2026-09-10",
        },
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_task_event_with_title(admin_client: AsyncClient, admin_user: dict) -> None:
    resp = await admin_client.post(
        "/v1/calendar/events",
        json={
            "type": "task",
            "title": "Revisar chamados Aegis",
            "agent_id": admin_user["id"],
            "event_date": "2026-09-10",
            "start_time": "17:00",
            "end_time": "17:30",
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["type"] == "task"
    assert body["title"] == "Revisar chamados Aegis"
    assert body["ticket_id"] is None


@pytest.mark.asyncio
async def test_create_task_event_linked_to_ticket(
    admin_client: AsyncClient, admin_user: dict, source_with_key: dict
) -> None:
    ingest = await admin_client.post(
        "/v1/ingest/tickets",
        headers={"X-Aegis-Key": source_with_key["api_key"]},
        json={
            "external_id": f"SUP-{uuid.uuid4().hex[:6].upper()}",
            "type": "bug",
            "priority": "high",
            "status": "open",
            "subject": "Test ticket for calendar link",
            "description": "n/a",
        },
    )
    assert ingest.status_code == 200
    ticket_id = ingest.json()["ticket_id"]

    resp = await admin_client.post(
        "/v1/calendar/events",
        json={
            "type": "task",
            "title": "Atacar o ticket",
            "agent_id": admin_user["id"],
            "event_date": "2026-09-10",
            "ticket_id": ticket_id,
        },
    )
    assert resp.status_code == 201
    assert resp.json()["ticket_id"] == ticket_id


@pytest.mark.asyncio
async def test_create_task_event_with_manual_color(
    admin_client: AsyncClient, admin_user: dict
) -> None:
    resp = await admin_client.post(
        "/v1/calendar/events",
        json={
            "type": "task",
            "title": "Tarefa com cor manual",
            "agent_id": admin_user["id"],
            "event_date": "2026-09-10",
            "color": "#38BDF8",
        },
    )
    assert resp.status_code == 201
    assert resp.json()["color"] == "#38BDF8"


@pytest.mark.asyncio
async def test_create_task_event_rejects_invalid_color(
    admin_client: AsyncClient, admin_user: dict
) -> None:
    resp = await admin_client.post(
        "/v1/calendar/events",
        json={
            "type": "task",
            "title": "Tarefa com cor inválida",
            "agent_id": admin_user["id"],
            "event_date": "2026-09-10",
            "color": "not-a-color",
        },
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_task_event_response_includes_ticket_tag_color(
    admin_client: AsyncClient, admin_user: dict, source_with_key: dict
) -> None:
    ingest = await admin_client.post(
        "/v1/ingest/tickets",
        headers={"X-Aegis-Key": source_with_key["api_key"]},
        json={
            "external_id": f"SUP-{uuid.uuid4().hex[:6].upper()}",
            "type": "bug",
            "priority": "high",
            "status": "open",
            "subject": "Test ticket for calendar color",
            "description": "n/a",
        },
    )
    ticket_id = ingest.json()["ticket_id"]

    tag = await admin_client.post(
        "/v1/tags", json={"name": f"cal-tag-{uuid.uuid4().hex[:6]}", "color": "#FF00AA"}
    )
    assert tag.status_code == 201
    tag_id = tag.json()["id"]

    tagged = await admin_client.put(f"/v1/tickets/{ticket_id}/tags", json={"tag_ids": [tag_id]})
    assert tagged.status_code == 200

    create = await admin_client.post(
        "/v1/calendar/events",
        json={
            "type": "task",
            "title": "Tarefa com cor herdada",
            "agent_id": admin_user["id"],
            "event_date": "2026-09-12",
            "ticket_id": ticket_id,
        },
    )
    assert create.status_code == 201
    body = create.json()
    assert body["ticket"]["id"] == ticket_id
    assert body["ticket"]["tags"][0]["color"] == "#FF00AA"

    # GET /events também precisa trazer o ticket+tags (usado pela view do grid)
    listing = await admin_client.get("/v1/calendar/events", params={"year": 2026, "month": 9})
    assert listing.status_code == 200
    listed = next(e for e in listing.json() if e["id"] == body["id"])
    assert listed["ticket"]["tags"][0]["color"] == "#FF00AA"


@pytest.mark.asyncio
async def test_agent_cannot_edit_another_agents_task(
    admin_client: AsyncClient,
    agent_client: AsyncClient,
    admin_user: dict,
) -> None:
    create = await admin_client.post(
        "/v1/calendar/events",
        json={
            "type": "task",
            "title": "Tarefa do admin",
            "agent_id": admin_user["id"],
            "event_date": "2026-09-11",
        },
    )
    assert create.status_code == 201
    event_id = create.json()["id"]

    resp = await agent_client.patch(
        f"/v1/calendar/events/{event_id}",
        json={"title": "Tentando editar"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_agent_can_edit_own_task(agent_client: AsyncClient, agent_user: dict) -> None:
    create = await agent_client.post(
        "/v1/calendar/events",
        json={
            "type": "task",
            "title": "Tarefa própria",
            "agent_id": agent_user["id"],
            "event_date": "2026-09-11",
        },
    )
    assert create.status_code == 201
    event_id = create.json()["id"]

    resp = await agent_client.patch(
        f"/v1/calendar/events/{event_id}",
        json={"title": "Tarefa própria editada"},
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Tarefa própria editada"
