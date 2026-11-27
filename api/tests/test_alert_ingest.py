from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime, time

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert_event import AlertEvent
from app.models.business_hours import BusinessHoursConfig
from app.models.notification import Notification
from app.models.sla_policy import SlaPolicy
from app.models.source import Source
from app.models.source_rate_window import SourceRateWindow
from app.models.tag import Tag
from app.models.ticket import Ticket
from app.models.ticket_event import TicketEvent
from app.services import rate_limit_service
from app.services.rate_limit_service import RateLimitService

ALERTS_URL = "/v1/ingest/alerts"


def _slug() -> str:
    return f"alert-{uuid.uuid4().hex[:8]}"


def _alert(fingerprint: str, **overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "event_id": uuid.uuid4().hex,
        "fingerprint": fingerprint,
        "priority": "urgent",
        "subject": "Disk full on server-a",
        "description": "/var at 100%",
        "metadata": {"server": "server-a", "rule": "disk-full"},
    }
    payload.update(overrides)
    return payload


@pytest.fixture
async def alert_source(admin_client: AsyncClient) -> dict:
    resp = await admin_client.post(
        "/v1/sources", json={"name": "Monitor", "slug": _slug(), "kind": "alert"}
    )
    assert resp.status_code == 201
    assert resp.json()["kind"] == "alert"
    return resp.json()


@pytest.fixture
def alert_headers(alert_source: dict) -> dict[str, str]:
    return {"X-Aegis-Key": alert_source["api_key"]}


@pytest.fixture
async def sla_config(db_session: AsyncSession) -> None:
    db_session.add(
        BusinessHoursConfig(
            id=1,
            work_days=[0, 1, 2, 3, 4, 5, 6],
            work_start=time(0, 0),
            work_end=time(23, 59),
            timezone="UTC",
        )
    )
    db_session.add(SlaPolicy(priority="urgent", resolution_hours=4))
    await db_session.commit()


async def _ticket(db: AsyncSession, ticket_id: int) -> Ticket:
    db.expire_all()
    ticket = await db.get(Ticket, ticket_id)
    assert ticket is not None
    return ticket


async def _event_types(db: AsyncSession, ticket_id: int) -> list[str]:
    result = await db.execute(
        select(TicketEvent.event_type).where(TicketEvent.ticket_id == ticket_id)
    )
    return list(result.scalars().all())


@pytest.mark.asyncio
async def test_same_fingerprint_three_times_is_one_ticket_with_three_occurrences(
    client: AsyncClient, alert_headers: dict, db_session: AsyncSession
) -> None:
    fingerprint = "server-a:disk-full"
    first = await client.post(ALERTS_URL, headers=alert_headers, json=_alert(fingerprint))
    assert first.status_code == 201
    assert first.json()["result"] == "created"
    ticket_id = first.json()["ticket_id"]

    for expected_count in (2, 3):
        resp = await client.post(
            ALERTS_URL,
            headers=alert_headers,
            json=_alert(fingerprint, subject="Changed subject", description="changed"),
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["result"] == "occurrence"
        assert body["ticket_id"] == ticket_id
        assert body["occurrence_count"] == expected_count

    ticket = await _ticket(db_session, ticket_id)
    assert ticket.occurrence_count == 3
    assert ticket.last_occurrence_at is not None
    # Occurrences never overwrite the text of the ticket
    assert ticket.subject == "Disk full on server-a"
    assert ticket.description == "/var at 100%"
    tickets = await db_session.execute(select(func.count()).select_from(Ticket))
    assert tickets.scalar_one() == 1
    assert sorted(await _event_types(db_session, ticket_id)) == [
        "alert_occurrence",
        "alert_occurrence",
        "created",
    ]


@pytest.mark.asyncio
async def test_same_event_id_twice_is_applied_once(
    client: AsyncClient, alert_headers: dict, db_session: AsyncSession
) -> None:
    payload = _alert("server-a:cpu")
    first = await client.post(ALERTS_URL, headers=alert_headers, json=payload)
    second = await client.post(ALERTS_URL, headers=alert_headers, json=payload)

    assert first.status_code == 201
    assert second.status_code == 200
    assert second.json()["result"] == "duplicate"
    assert second.json()["ticket_id"] == first.json()["ticket_id"]
    assert second.json()["occurrence_count"] == 1

    events = await db_session.execute(select(func.count()).select_from(AlertEvent))
    assert events.scalar_one() == 1
    ticket = await _ticket(db_session, first.json()["ticket_id"])
    assert ticket.occurrence_count == 1


@pytest.mark.asyncio
async def test_event_id_is_scoped_per_source(
    client: AsyncClient, admin_client: AsyncClient, alert_headers: dict
) -> None:
    other = await admin_client.post(
        "/v1/sources", json={"name": "Other", "slug": _slug(), "kind": "alert"}
    )
    payload = _alert("server-a:cpu")
    first = await client.post(ALERTS_URL, headers=alert_headers, json=payload)
    second = await client.post(
        ALERTS_URL, headers={"X-Aegis-Key": other.json()["api_key"]}, json=payload
    )
    assert first.json()["result"] == "created"
    assert second.json()["result"] == "created"
    assert first.json()["ticket_id"] != second.json()["ticket_id"]


@pytest.mark.asyncio
async def test_fingerprint_of_closed_ticket_opens_new_linked_ticket(
    client: AsyncClient, alert_headers: dict, db_session: AsyncSession
) -> None:
    fingerprint = "server-a:memory"
    first = await client.post(ALERTS_URL, headers=alert_headers, json=_alert(fingerprint))
    old_id = first.json()["ticket_id"]
    old = await _ticket(db_session, old_id)
    old.status = "closed"
    await db_session.commit()

    again = await client.post(ALERTS_URL, headers=alert_headers, json=_alert(fingerprint))
    assert again.status_code == 201
    body = again.json()
    assert body["result"] == "created"
    assert body["ticket_id"] != old_id
    assert body["previous_ticket_id"] == old_id

    new = await _ticket(db_session, body["ticket_id"])
    assert new.previous_ticket_id == old_id
    assert new.occurrence_count == 1
    assert "alert_recurred" in await _event_types(db_session, old_id)
    assert (await _ticket(db_session, old_id)).status == "closed"


@pytest.mark.asyncio
async def test_pending_closure_counts_as_open(
    client: AsyncClient, alert_headers: dict, db_session: AsyncSession
) -> None:
    fingerprint = "server-a:queue"
    first = await client.post(ALERTS_URL, headers=alert_headers, json=_alert(fingerprint))
    ticket = await _ticket(db_session, first.json()["ticket_id"])
    ticket.status = "pending_closure"
    await db_session.commit()

    again = await client.post(ALERTS_URL, headers=alert_headers, json=_alert(fingerprint))
    assert again.json()["result"] == "occurrence"
    assert again.json()["ticket_id"] == first.json()["ticket_id"]


@pytest.mark.asyncio
async def test_occurrence_of_merged_ticket_lands_on_merge_target(
    client: AsyncClient, alert_headers: dict, db_session: AsyncSession
) -> None:
    merged = await client.post(ALERTS_URL, headers=alert_headers, json=_alert("fp-merged"))
    target = await client.post(ALERTS_URL, headers=alert_headers, json=_alert("fp-target"))
    merged_ticket = await _ticket(db_session, merged.json()["ticket_id"])
    merged_ticket.status = "merged"
    merged_ticket.merged_into_ticket_id = target.json()["ticket_id"]
    await db_session.commit()

    again = await client.post(ALERTS_URL, headers=alert_headers, json=_alert("fp-merged"))
    assert again.json()["result"] == "occurrence"
    assert again.json()["ticket_id"] == target.json()["ticket_id"]


@pytest.mark.asyncio
async def test_resolved_event_is_noted_without_closing(
    client: AsyncClient, alert_headers: dict, db_session: AsyncSession
) -> None:
    fingerprint = "server-a:ping"
    first = await client.post(ALERTS_URL, headers=alert_headers, json=_alert(fingerprint))
    resolved = await client.post(
        ALERTS_URL, headers=alert_headers, json=_alert(fingerprint, status="resolved")
    )
    assert resolved.status_code == 200
    assert resolved.json()["result"] == "resolved_noted"
    ticket = await _ticket(db_session, first.json()["ticket_id"])
    assert ticket.status == "open"
    assert ticket.occurrence_count == 1
    assert "alert_resolved" in await _event_types(db_session, ticket.id)

    orphan = await client.post(
        ALERTS_URL, headers=alert_headers, json=_alert("never-fired", status="resolved")
    )
    assert orphan.status_code == 200
    assert orphan.json()["result"] == "ignored"
    assert orphan.json()["ticket_id"] is None


@pytest.mark.asyncio
async def test_alert_sla_starts_at_creation(
    client: AsyncClient, alert_headers: dict, db_session: AsyncSession, sla_config: None
) -> None:
    resp = await client.post(ALERTS_URL, headers=alert_headers, json=_alert("fp-sla"))
    ticket = await _ticket(db_session, resp.json()["ticket_id"])
    assert ticket.status == "open"
    assert ticket.sla_started_at is not None
    assert ticket.sla_due_at is not None


@pytest.mark.asyncio
async def test_legacy_ingest_of_alert_source_starts_sla(
    client: AsyncClient, alert_headers: dict, db_session: AsyncSession, sla_config: None
) -> None:
    resp = await client.post(
        "/v1/ingest/tickets",
        headers=alert_headers,
        json={
            "external_id": "legacy-signature",
            "priority": "urgent",
            "status": "open",
            "subject": "Legacy alert",
        },
    )
    assert resp.json()["created"] is True
    ticket = await _ticket(db_session, resp.json()["ticket_id"])
    assert ticket.sla_started_at is not None


@pytest.mark.asyncio
async def test_system_source_sla_still_waits_for_in_progress(
    client: AsyncClient, admin_client: AsyncClient, db_session: AsyncSession, sla_config: None
) -> None:
    source = await admin_client.post("/v1/sources", json={"name": "GF", "slug": _slug()})
    resp = await client.post(
        "/v1/ingest/tickets",
        headers={"X-Aegis-Key": source.json()["api_key"]},
        json={"external_id": "SUP-1", "priority": "urgent", "status": "open", "subject": "x"},
    )
    ticket = await _ticket(db_session, resp.json()["ticket_id"])
    assert ticket.sla_started_at is None


@pytest.mark.asyncio
async def test_system_source_cannot_use_alert_contract(
    client: AsyncClient, admin_client: AsyncClient
) -> None:
    source = await admin_client.post("/v1/sources", json={"name": "GF", "slug": _slug()})
    resp = await client.post(
        ALERTS_URL, headers={"X-Aegis-Key": source.json()["api_key"]}, json=_alert("fp")
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_alert_source_tag_and_recipient(
    client: AsyncClient,
    admin_client: AsyncClient,
    alert_source: dict,
    alert_headers: dict,
    admin_user: dict,
    db_session: AsyncSession,
) -> None:
    tag = Tag(name=f"Monitor-{uuid.uuid4().hex[:6]}")
    db_session.add(tag)
    await db_session.commit()

    patch = await admin_client.patch(
        f"/v1/sources/{alert_source['id']}",
        json={"alert_tag_id": tag.id, "alert_recipient_user_id": admin_user["id"]},
    )
    assert patch.status_code == 200
    assert patch.json()["alert_tag_id"] == tag.id

    created = await client.post(ALERTS_URL, headers=alert_headers, json=_alert("fp-tag"))
    ticket_id = created.json()["ticket_id"]
    await client.post(ALERTS_URL, headers=alert_headers, json=_alert("fp-tag"))

    detail = await admin_client.get(f"/v1/tickets/{ticket_id}")
    assert [t["id"] for t in detail.json()["tags"]] == [tag.id]
    assert detail.json()["occurrence_count"] == 2
    critical = await db_session.execute(
        select(func.count())
        .select_from(Notification)
        .where(Notification.type == "critical_source", Notification.ticket_id == ticket_id)
    )
    # Raised once, at creation — not again on the occurrence
    assert critical.scalar_one() == 1

    cleared = await admin_client.patch(
        f"/v1/sources/{alert_source['id']}", json={"alert_recipient_user_id": None}
    )
    assert cleared.json()["alert_recipient_user_id"] is None
    assert cleared.json()["alert_tag_id"] == tag.id

    missing = await admin_client.patch(
        f"/v1/sources/{alert_source['id']}", json={"alert_tag_id": 999_999}
    )
    assert missing.status_code == 422


@pytest.mark.asyncio
async def test_rate_limit_answers_429(
    client: AsyncClient,
    admin_client: AsyncClient,
    alert_source: dict,
    alert_headers: dict,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await admin_client.patch(f"/v1/sources/{alert_source['id']}", json={"rate_limit_per_minute": 2})
    # Pin the clock inside one window: real requests could straddle a minute boundary.
    fixed_now = datetime(2026, 1, 1, 10, 0, 20, tzinfo=UTC)
    monkeypatch.setattr(rate_limit_service, "utcnow", lambda: fixed_now)

    statuses = [
        (await client.get("/v1/ingest/tickets/status", headers=alert_headers)).status_code
        for _ in range(3)
    ]
    assert statuses == [200, 200, 429]
    blocked = await client.get("/v1/ingest/tickets/status", headers=alert_headers)
    assert blocked.headers["Retry-After"] == "40"


@pytest.mark.asyncio
async def test_rate_limit_window_resets_and_old_windows_are_pruned(
    client: AsyncClient, alert_source: dict, db_session: AsyncSession
) -> None:
    source = await db_session.get(Source, alert_source["id"])
    assert source is not None
    source.rate_limit_per_minute = 1
    await db_session.commit()

    service = RateLimitService(db_session)
    old = datetime(2026, 1, 1, 10, 0, 30, tzinfo=UTC)
    assert (await service.hit(source, old)).allowed is True
    assert (await service.hit(source, old)).allowed is False
    later = datetime(2026, 1, 1, 10, 30, 5, tzinfo=UTC)
    decision = await service.hit(source, later)
    assert decision.allowed is True
    assert decision.retry_after_seconds == 55

    windows = await db_session.execute(
        select(func.count())
        .select_from(SourceRateWindow)
        .where(SourceRateWindow.source_id == source.id)
    )
    assert windows.scalar_one() == 1


@pytest.mark.asyncio
async def test_alert_payload_validation(client: AsyncClient, alert_headers: dict) -> None:
    missing_fingerprint = _alert("fp")
    del missing_fingerprint["fingerprint"]
    assert (
        await client.post(ALERTS_URL, headers=alert_headers, json=missing_fingerprint)
    ).status_code == 422
    assert (
        await client.post(ALERTS_URL, headers=alert_headers, json=_alert("fp", priority="p1"))
    ).status_code == 422
    assert (
        await client.post(ALERTS_URL, headers=alert_headers, json=_alert("fp", contract_version=2))
    ).status_code == 422


@pytest.mark.asyncio
async def test_concurrent_first_occurrences_open_one_ticket(
    client: AsyncClient, alert_headers: dict, db_session: AsyncSession
) -> None:
    fingerprint = "server-a:burst"
    responses = await asyncio.gather(
        *(
            client.post(ALERTS_URL, headers=alert_headers, json=_alert(fingerprint))
            for _ in range(4)
        )
    )
    assert all(r.status_code in (200, 201) for r in responses)
    results = sorted(r.json()["result"] for r in responses)
    assert results == ["created", "occurrence", "occurrence", "occurrence"]
    assert len({r.json()["ticket_id"] for r in responses}) == 1
    tickets = await db_session.execute(
        select(func.count()).select_from(Ticket).where(Ticket.alert_fingerprint == fingerprint)
    )
    assert tickets.scalar_one() == 1
    ticket = await _ticket(db_session, responses[0].json()["ticket_id"])
    assert ticket.occurrence_count == 4
