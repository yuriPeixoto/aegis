from __future__ import annotations

import asyncio
import uuid

import pytest
from httpx import AsyncClient

from app.services import ticket_sync_hooks

# Real fire-and-forget dispatch does a DB round-trip (fresh session, re-fetch
# ticket+source) before ever calling dispatch_webhook. There's no task handle
# exposed to await directly, so tests give the scheduled asyncio task a moment
# to actually run rather than asserting immediately after the HTTP call returns.
_SETTLE_SECONDS = 0.3


def unique_slug() -> str:
    return f"sync-hooks-{uuid.uuid4().hex[:8]}"


def unique_external_id() -> str:
    return f"SUP-2026-{uuid.uuid4().hex[:6].upper()}"


@pytest.fixture
def captured_webhook_calls(monkeypatch: pytest.MonkeyPatch) -> list[dict]:
    """Stubs the actual HTTP delivery only — exercises the real hook detection
    logic, the real DB re-fetch, and the real status-override/payload building
    in ticket_sync_hooks._notify_source_of_status_change."""
    calls: list[dict] = []

    async def fake_dispatch_webhook(
        *,
        webhook_url: str,
        webhook_secret: str | None,
        event_type: str,
        payload: dict,
        webhook_url_internal: str | None = None,
    ) -> None:
        calls.append({"event_type": event_type, "payload": payload})

    monkeypatch.setattr(ticket_sync_hooks, "dispatch_webhook", fake_dispatch_webhook)
    return calls


@pytest.fixture
async def source_with_webhook(admin_client: AsyncClient) -> dict:
    resp = await admin_client.post(
        "/v1/sources", json={"name": "Sync Hooks Test Source", "slug": unique_slug()}
    )
    assert resp.status_code == 201
    source = resp.json()

    # SourceCreate accepts webhook_url, but SourceService.create() silently
    # ignores it — only SourceService.update() (this PATCH) actually persists
    # it. Found while writing this fixture; not this ticket's scope to fix.
    patch_resp = await admin_client.patch(
        f"/v1/sources/{source['id']}",
        json={"webhook_url": "http://gf.test/api/aegis/webhook"},
    )
    assert patch_resp.status_code == 200

    return source


@pytest.fixture
async def ingested_ticket(client: AsyncClient, source_with_webhook: dict) -> dict:
    external_id = unique_external_id()
    resp = await client.post(
        "/v1/ingest/tickets",
        headers={"X-Aegis-Key": source_with_webhook["api_key"]},
        json={
            "external_id": external_id,
            "type": "bug",
            "priority": "high",
            "status": "open",
            "subject": "Sync hooks regression fixture",
            "description": "n/a",
        },
    )
    assert resp.status_code == 200
    return {"ticket_id": resp.json()["ticket_id"], "external_id": external_id}


@pytest.mark.asyncio
async def test_update_ticket_status_relays_exactly_once(
    admin_client: AsyncClient,
    ingested_ticket: dict,
    captured_webhook_calls: list[dict],
) -> None:
    """Regressão: TicketController::updateStatus() só disparava o webhook granular
    quando a troca vinha da rota manual — todo o resto (addResponse, reopenTicket,
    assignTicket, qualityReview) contava só com o upsert completo. Aqui a garantia
    é uma só, disparada pelo hook — não deve haver disparo duplicado."""
    resp = await admin_client.patch(
        f"/v1/tickets/{ingested_ticket['ticket_id']}/status",
        json={"status": "in_progress", "comment": "Assumindo o chamado"},
    )
    assert resp.status_code == 200

    await asyncio.sleep(_SETTLE_SECONDS)

    assert len(captured_webhook_calls) == 1
    call = captured_webhook_calls[0]
    assert call["event_type"] == "status_changed"
    assert call["payload"]["external_id"] == ingested_ticket["external_id"]
    assert call["payload"]["status"] == "in_progress"
    assert call["payload"]["changed_by"] == "Test Admin"


@pytest.mark.asyncio
async def test_merge_ticket_relays_as_closed_to_source(
    admin_client: AsyncClient,
    client: AsyncClient,
    source_with_webhook: dict,
    ingested_ticket: dict,
    captured_webhook_calls: list[dict],
) -> None:
    """Aegis #1437: merge_ticket() mudava ticket.status pra "merged" sem nunca
    notificar o sistema de origem — o ticket ficava travado pra sempre no último
    status sincronizado (achado via #SUP-2026-0670). "merged" também não tem
    equivalente no GF, então é reportado como "closed" (ver
    _STATUS_OVERRIDES_FOR_SOURCE)."""
    target_resp = await client.post(
        "/v1/ingest/tickets",
        headers={"X-Aegis-Key": source_with_webhook["api_key"]},
        json={
            "external_id": unique_external_id(),
            "type": "bug",
            "priority": "high",
            "status": "open",
            "subject": "Target ticket for merge",
            "description": "n/a",
        },
    )
    assert target_resp.status_code == 200
    target_id = target_resp.json()["ticket_id"]

    resp = await admin_client.post(
        f"/v1/tickets/{ingested_ticket['ticket_id']}/merge",
        json={"target_ticket_id": target_id},
    )
    assert resp.status_code == 200

    await asyncio.sleep(_SETTLE_SECONDS)

    assert len(captured_webhook_calls) == 1
    call = captured_webhook_calls[0]
    assert call["event_type"] == "status_changed"
    assert call["payload"]["external_id"] == ingested_ticket["external_id"]
    assert call["payload"]["status"] == "closed"
    assert call["payload"]["changed_by"] == "Test Admin"


@pytest.mark.asyncio
async def test_bulk_update_relays_status_changed_not_status_updated(
    admin_client: AsyncClient,
    ingested_ticket: dict,
    captured_webhook_calls: list[dict],
) -> None:
    """Regressão: a rota de bulk-update disparava event_type="status_updated" —
    a AegisWebhookController do GF só reconhece "status_changed" (nome diferente
    por acidente), então mudanças de status em massa nunca chegavam no GF,
    mesmo com webhook_url configurado e a chamada HTTP "funcionando"."""
    resp = await admin_client.post(
        "/v1/tickets/bulk-update",
        json={"ticket_ids": [ingested_ticket["ticket_id"]], "status": "cancelled"},
    )
    assert resp.status_code == 200

    await asyncio.sleep(_SETTLE_SECONDS)

    assert len(captured_webhook_calls) == 1
    call = captured_webhook_calls[0]
    assert call["event_type"] == "status_changed"
    assert call["payload"]["status"] == "cancelled"


@pytest.mark.asyncio
async def test_no_relay_when_source_has_no_webhook_url(
    admin_client: AsyncClient,
    client: AsyncClient,
    captured_webhook_calls: list[dict],
) -> None:
    source_resp = await admin_client.post(
        "/v1/sources", json={"name": "No Webhook Source", "slug": unique_slug()}
    )
    assert source_resp.status_code == 201
    source = source_resp.json()

    external_id = unique_external_id()
    ingest_resp = await client.post(
        "/v1/ingest/tickets",
        headers={"X-Aegis-Key": source["api_key"]},
        json={
            "external_id": external_id,
            "type": "bug",
            "priority": "high",
            "status": "open",
            "subject": "No webhook configured",
            "description": "n/a",
        },
    )
    assert ingest_resp.status_code == 200
    ticket_id = ingest_resp.json()["ticket_id"]

    resp = await admin_client.patch(
        f"/v1/tickets/{ticket_id}/status", json={"status": "in_progress"}
    )
    assert resp.status_code == 200

    await asyncio.sleep(_SETTLE_SECONDS)

    assert captured_webhook_calls == []
