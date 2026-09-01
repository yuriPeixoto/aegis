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
async def test_list_tickets_requires_auth(client: AsyncClient, ingested_ticket: dict) -> None:
    """Regressão: as duas rotas de leitura já responderam 200 sem cabeçalho nenhum,
    expondo assunto, descrição, cliente de origem e CSAT de todos os tickets."""
    response = await client.get("/v1/tickets")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_ticket_requires_auth(client: AsyncClient, ingested_ticket: dict) -> None:
    response = await client.get(f"/v1/tickets/{ingested_ticket['ticket_id']}")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_source_api_key_does_not_grant_ticket_read(
    client: AsyncClient, ingested_ticket: dict
) -> None:
    """A chave de source autentica ingestão, não leitura de dashboard — o 401 aqui
    é o que separa 'o GF pode enviar tickets' de 'o GF pode ler todos os tickets'."""
    response = await client.get("/v1/tickets", headers={"X-Aegis-Key": ingested_ticket["api_key"]})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_tickets(admin_client: AsyncClient, ingested_ticket: dict) -> None:
    response = await admin_client.get("/v1/tickets")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_list_tickets_filter_by_source(
    admin_client: AsyncClient, ingested_ticket: dict
) -> None:
    response = await admin_client.get(
        "/v1/tickets", params={"source_id": ingested_ticket["source_id"]}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    for item in data["items"]:
        assert item["source_id"] == ingested_ticket["source_id"]


@pytest.mark.asyncio
async def test_list_tickets_filter_by_status(
    admin_client: AsyncClient, ingested_ticket: dict
) -> None:
    response = await admin_client.get("/v1/tickets", params={"status": "open"})
    assert response.status_code == 200
    for item in response.json()["items"]:
        assert item["status"] == "open"


@pytest.mark.asyncio
async def test_get_ticket_detail(admin_client: AsyncClient, ingested_ticket: dict) -> None:
    response = await admin_client.get(f"/v1/tickets/{ingested_ticket['ticket_id']}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == ingested_ticket["ticket_id"]
    assert data["external_id"] == ingested_ticket["external_id"]
    assert "events" in data
    assert len(data["events"]) >= 1
    assert data["events"][0]["event_type"] == "created"


@pytest.mark.asyncio
async def test_get_ticket_not_found(admin_client: AsyncClient) -> None:
    response = await admin_client.get("/v1/tickets/999999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_tickets_pagination(admin_client: AsyncClient, ingested_ticket: dict) -> None:
    response = await admin_client.get("/v1/tickets", params={"limit": 1, "offset": 0})
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) <= 1
    assert data["limit"] == 1


@pytest.mark.asyncio
async def test_list_tickets_by_fixed_ticket_ids(
    admin_client: AsyncClient, source_with_key: dict
) -> None:
    """A saved view with a fixed ticket list (e.g. a weekly sprint) should return
    exactly those tickets, ignoring status/priority/etc — even a resolved one."""
    ticket_ids = []
    for status in ("open", "resolved"):
        resp = await admin_client.post(
            "/v1/ingest/tickets",
            headers={"X-Aegis-Key": source_with_key["api_key"]},
            json={
                "external_id": unique_external_id(),
                "status": status,
                "subject": f"Sprint ticket ({status})",
            },
        )
        ticket_ids.append(resp.json()["ticket_id"])

    # Ticket that should NOT appear even though it matches nothing about ticket_ids
    other = await admin_client.post(
        "/v1/ingest/tickets",
        headers={"X-Aegis-Key": source_with_key["api_key"]},
        json={"external_id": unique_external_id(), "status": "open", "subject": "Not in sprint"},
    )
    other_id = other.json()["ticket_id"]

    response = await admin_client.get("/v1/tickets", params={"ticket_ids": ticket_ids})
    assert response.status_code == 200
    data = response.json()
    returned_ids = {item["id"] for item in data["items"]}
    assert returned_ids == set(ticket_ids)
    assert other_id not in returned_ids
    assert data["total"] == 2


@pytest.mark.asyncio
async def test_assign_ticket_notifies_new_assignee(
    admin_client: AsyncClient, agent_client: AsyncClient, agent_user: dict, ingested_ticket: dict
) -> None:
    """#1086 — atribuir um ticket a alguém deve gerar uma notificação pra essa pessoa
    (base pro modal de confirmação bloqueante que o frontend renderiza)."""
    response = await admin_client.patch(
        f"/v1/tickets/{ingested_ticket['ticket_id']}/assign",
        json={"user_id": agent_user["id"]},
    )
    assert response.status_code == 200

    notif_response = await agent_client.get("/v1/me/notifications", params={"unread_only": True})
    assert notif_response.status_code == 200
    notifications = notif_response.json()
    assigned = [n for n in notifications if n["type"] == "assigned"]
    assert len(assigned) == 1
    assert assigned[0]["ticket_id"] == ingested_ticket["ticket_id"]
    assert assigned[0]["ticket_external_id"] == ingested_ticket["external_id"]


@pytest.mark.asyncio
async def test_assign_ticket_to_self_does_not_notify(
    admin_client: AsyncClient, admin_user: dict, ingested_ticket: dict
) -> None:
    """Atribuir a si mesmo (ex: botão 'Atribuir a mim') não deve gerar notificação —
    a pessoa já sabe que acabou de se atribuir o ticket."""
    response = await admin_client.patch(
        f"/v1/tickets/{ingested_ticket['ticket_id']}/assign",
        json={"user_id": admin_user["id"]},
    )
    assert response.status_code == 200

    notif_response = await admin_client.get("/v1/me/notifications", params={"unread_only": True})
    assigned = [n for n in notif_response.json() if n["type"] == "assigned"]
    assert len(assigned) == 0


@pytest.mark.asyncio
async def test_reassign_same_user_does_not_duplicate_notification(
    admin_client: AsyncClient, agent_client: AsyncClient, agent_user: dict, ingested_ticket: dict
) -> None:
    """Re-atribuir pro mesmo agente que já estava (no-op) não deve gerar uma 2ª notificação."""
    ticket_url = f"/v1/tickets/{ingested_ticket['ticket_id']}/assign"
    first = await admin_client.patch(ticket_url, json={"user_id": agent_user["id"]})
    assert first.status_code == 200
    second = await admin_client.patch(ticket_url, json={"user_id": agent_user["id"]})
    assert second.status_code == 200

    notif_response = await agent_client.get("/v1/me/notifications", params={"unread_only": True})
    assigned = [n for n in notif_response.json() if n["type"] == "assigned"]
    assert len(assigned) == 1
