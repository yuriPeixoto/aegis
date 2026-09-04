from __future__ import annotations

import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.services.user_service import UserService


def unique_slug() -> str:
    return f"cal-src-{uuid.uuid4().hex[:8]}"


@pytest.fixture
async def other_agent_user(db_session: AsyncSession) -> dict:
    email = f"other-agent-{uuid.uuid4().hex[:8]}@aegis.test"
    password = "OtherAgentP@ss1"
    user = await UserService(db_session).create(
        email=email, password=password, name="Other Agent", role="agent", must_change_password=False
    )
    return {"id": user.id, "email": email, "password": password}


@pytest.fixture
async def other_agent_client(client: AsyncClient, other_agent_user: dict) -> AsyncClient:
    resp = await client.post(
        "/v1/auth/login",
        json={"email": other_agent_user["email"], "password": other_agent_user["password"]},
    )
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": f"Bearer {resp.json()['access_token']}"},
    ) as ac:
        yield ac


@pytest.fixture
async def source_with_key(admin_client: AsyncClient) -> dict:
    resp = await admin_client.post(
        "/v1/sources",
        json={"name": "Calendar Test Source", "slug": unique_slug()},
    )
    assert resp.status_code == 201
    return resp.json()


async def _ingest_ticket_in_progress(admin_client: AsyncClient, source_with_key: dict) -> int:
    """Ingesta um ticket e avança pra in_progress (pré-requisito de pending_closure)."""
    ingest = await admin_client.post(
        "/v1/ingest/tickets",
        headers={"X-Aegis-Key": source_with_key["api_key"]},
        json={
            "external_id": f"SUP-{uuid.uuid4().hex[:6].upper()}",
            "type": "bug",
            "priority": "high",
            "status": "open",
            "subject": "Ticket de teste — fechamento",
            "description": "n/a",
        },
    )
    assert ingest.status_code == 200
    ticket_id = ingest.json()["ticket_id"]
    resp = await admin_client.patch(f"/v1/tickets/{ticket_id}/status", json={"status": "in_progress"})
    assert resp.status_code == 200
    return ticket_id


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


# ── Fechamento de ticket → tarefa concluída na Agenda ──────────────────────────


@pytest.mark.asyncio
async def test_closing_ticket_without_prior_task_creates_completed_one(
    admin_client: AsyncClient, source_with_key: dict
) -> None:
    ticket_id = await _ingest_ticket_in_progress(admin_client, source_with_key)

    resp = await admin_client.patch(
        f"/v1/tickets/{ticket_id}/status",
        json={
            "status": "pending_closure",
            "deployment_scheduled_at": "2026-09-10T14:30:00Z",
            "pr_number": "#4242",
        },
    )
    assert resp.status_code == 200

    events = (
        await admin_client.get("/v1/calendar/events", params={"year": 2026, "month": 9})
    ).json()
    linked = [e for e in events if e["ticket_id"] == ticket_id]
    assert len(linked) == 1
    task = linked[0]
    assert task["type"] == "task"
    assert task["pr_number"] == "#4242"
    assert task["completed_at"] is not None
    assert task["event_date"] == "2026-09-10"
    assert task["start_time"] == "14:30"


@pytest.mark.asyncio
async def test_closing_ticket_updates_existing_scheduled_task_instead_of_duplicating(
    admin_client: AsyncClient, admin_user: dict, source_with_key: dict
) -> None:
    ticket_id = await _ingest_ticket_in_progress(admin_client, source_with_key)

    # Tarefa agendada de propósito antes do fechamento (fluxo #602)
    scheduled = await admin_client.post(
        "/v1/calendar/events",
        json={
            "type": "task",
            "title": "Atacar o chamado hoje",
            "agent_id": admin_user["id"],
            "event_date": "2026-09-08",
            "start_time": "09:00",
        },
    )
    assert scheduled.status_code == 201
    task_id = scheduled.json()["id"]

    # Vincula manualmente (simula o que o #602 fará) e fecha o chamado
    link = await admin_client.patch(
        f"/v1/calendar/events/{task_id}", json={"ticket_id": ticket_id}
    )
    assert link.status_code == 200

    resp = await admin_client.patch(
        f"/v1/tickets/{ticket_id}/status",
        json={
            "status": "pending_closure",
            "deployment_scheduled_at": "2026-09-10T14:30:00Z",
        },
    )
    assert resp.status_code == 200

    events = (
        await admin_client.get("/v1/calendar/events", params={"year": 2026, "month": 9})
    ).json()
    linked = [e for e in events if e["ticket_id"] == ticket_id]
    assert len(linked) == 1, "fechamento não deveria duplicar a tarefa já agendada"
    assert linked[0]["id"] == task_id
    assert linked[0]["title"] == "Atacar o chamado hoje"  # título original preservado
    assert linked[0]["completed_at"] is not None
    assert linked[0]["pr_number"] is None  # skipInfo — nem todo fechamento tem PR


@pytest.mark.asyncio
async def test_closing_ticket_allows_null_pr_number(
    admin_client: AsyncClient, source_with_key: dict
) -> None:
    """Chamados internos (WhatsApp, log-watcher, Cronwatch, Aegis Internal) não geram PR."""
    ticket_id = await _ingest_ticket_in_progress(admin_client, source_with_key)

    resp = await admin_client.patch(
        f"/v1/tickets/{ticket_id}/status",
        json={"status": "pending_closure", "deployment_scheduled_at": "2026-09-10T14:30:00Z"},
    )
    assert resp.status_code == 200

    events = (
        await admin_client.get("/v1/calendar/events", params={"year": 2026, "month": 9})
    ).json()
    linked = next(e for e in events if e["ticket_id"] == ticket_id)
    assert linked["pr_number"] is None
    assert linked["completed_at"] is not None


# ── Visibilidade por usuário (#598) ─────────────────────────────────────────────
# Tarefa é sempre individual (só o dono vê a própria, nem admin vê a de outro
# na Agenda). Plantão/treinamento continuam compartilhados com toda a equipe.


@pytest.mark.asyncio
async def test_task_not_visible_to_other_agents(
    agent_client: AsyncClient, agent_user: dict, other_agent_client: AsyncClient
) -> None:
    create = await agent_client.post(
        "/v1/calendar/events",
        json={
            "type": "task",
            "title": "Tarefa privada do agent",
            "agent_id": agent_user["id"],
            "event_date": "2026-09-15",
        },
    )
    assert create.status_code == 201
    task_id = create.json()["id"]

    own_view = await agent_client.get("/v1/calendar/events", params={"year": 2026, "month": 9})
    assert any(e["id"] == task_id for e in own_view.json())

    other_view = await other_agent_client.get(
        "/v1/calendar/events", params={"year": 2026, "month": 9}
    )
    assert all(e["id"] != task_id for e in other_view.json())


@pytest.mark.asyncio
async def test_task_not_visible_to_admin_either(
    agent_client: AsyncClient, agent_user: dict, admin_client: AsyncClient
) -> None:
    create = await agent_client.post(
        "/v1/calendar/events",
        json={
            "type": "task",
            "title": "Tarefa privada do agent",
            "agent_id": agent_user["id"],
            "event_date": "2026-09-15",
        },
    )
    assert create.status_code == 201
    task_id = create.json()["id"]

    admin_view = await admin_client.get("/v1/calendar/events", params={"year": 2026, "month": 9})
    assert all(e["id"] != task_id for e in admin_view.json())


@pytest.mark.asyncio
async def test_on_call_and_training_stay_shared(
    admin_client: AsyncClient, agent_user: dict, source_with_key: dict, other_agent_client: AsyncClient
) -> None:
    on_call = await admin_client.post(
        "/v1/calendar/events",
        json={"type": "on_call", "agent_id": agent_user["id"], "event_date": "2026-09-19"},
    )
    assert on_call.status_code == 201
    on_call_id = on_call.json()["id"]

    training = await admin_client.post(
        "/v1/calendar/events",
        json={
            "type": "training",
            "agent_id": agent_user["id"],
            "event_date": "2026-09-19",
            "source_id": source_with_key["id"],
        },
    )
    assert training.status_code == 201
    training_id = training.json()["id"]

    view = await other_agent_client.get("/v1/calendar/events", params={"year": 2026, "month": 9})
    ids = [e["id"] for e in view.json()]
    assert on_call_id in ids
    assert training_id in ids
