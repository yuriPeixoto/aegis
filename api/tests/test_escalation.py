from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.escalation_rule import EscalationRule
from app.models.ticket import Ticket
from app.models.ticket_event import TicketEvent
from app.models.ticket_message import TicketMessage
from app.services.escalation_service import EscalationService
from app.services.user_service import UserService

_NO_UPDATE_RULE = "Sem atualização — 48h"
_NO_UPDATE_LOW_RULE = "Sem atualização — 48h (baixa/média prioridade)"


def unique_slug() -> str:
    return f"src-{uuid.uuid4().hex[:8]}"


def unique_external_id() -> str:
    return f"SUP-2026-{uuid.uuid4().hex[:6].upper()}"


@pytest.fixture
async def source_with_key(admin_client: AsyncClient) -> dict:
    resp = await admin_client.post(
        "/v1/sources",
        json={"name": "Escalation Test Source", "slug": unique_slug()},
    )
    assert resp.status_code == 201
    return resp.json()


async def _ingest_stale_ticket(
    client: AsyncClient,
    db_session: AsyncSession,
    api_key: str,
    priority: str,
    hours_stale: float = 50,
) -> int:
    """Ingest a ticket and backdate first_ingested_at so it looks stale for no_update rules."""
    resp = await client.post(
        "/v1/ingest/tickets",
        headers={"X-Aegis-Key": api_key},
        json={
            "external_id": unique_external_id(),
            "type": "bug",
            "priority": priority,
            "status": "open",
            "subject": "Ticket parado",
            "description": "Sem atividade há tempos.",
        },
    )
    assert resp.status_code == 200
    ticket_id = resp.json()["ticket_id"]

    # Both the ticket's own timestamp and its "created" TicketEvent (which also counts
    # as activity for _last_activity_at) need to be backdated for a no_update rule to
    # consider this ticket stale.
    stale_at = datetime.now(tz=UTC) - timedelta(hours=hours_stale)
    await db_session.execute(
        update(Ticket).where(Ticket.id == ticket_id).values(first_ingested_at=stale_at)
    )
    await db_session.execute(
        update(TicketEvent).where(TicketEvent.ticket_id == ticket_id).values(occurred_at=stale_at)
    )
    await db_session.commit()
    return ticket_id


@pytest.fixture
async def senior_agent(db_session: AsyncSession) -> dict:
    email = f"senior-{uuid.uuid4().hex[:8]}@aegis.test"
    user = await UserService(db_session).create(
        email=email, password="SeniorP@ss1", name="Senior Agent", role="agent",
        must_change_password=False,
    )
    await UserService(db_session).update(user.id, is_senior=True)
    return {"id": user.id, "email": email}


async def _make_rule(db_session: AsyncSession, **overrides) -> EscalationRule:
    """Builds an EscalationRule row directly — tests run against Base.metadata.create_all,
    not the alembic migrations, so the production seed data from 022/036 isn't present."""
    defaults = dict(
        name=_NO_UPDATE_RULE,
        is_active=True,
        trigger_type="no_update",
        trigger_hours=48,
        condition_priority=["high", "urgent"],
        condition_status=["open", "in_progress"],
        action_type="notify_senior_agents",
        action_user_id=None,
        action_tag_id=None,
        cooldown_hours=24.0,
    )
    defaults.update(overrides)
    rule = EscalationRule(**defaults)
    db_session.add(rule)
    await db_session.commit()
    await db_session.refresh(rule)
    return rule


@pytest.fixture
async def no_update_rules(db_session: AsyncSession) -> dict[str, EscalationRule]:
    """The two rules 036 creates in production, mirrored here for the escalation tests."""
    high = await _make_rule(db_session)
    low = await _make_rule(
        db_session,
        name=_NO_UPDATE_LOW_RULE,
        condition_priority=["low", "medium"],
        cooldown_hours=168.0,
    )
    return {"high": high, "low": low}


@pytest.mark.asyncio
async def test_no_update_rule_ignores_low_priority(
    client: AsyncClient,
    db_session: AsyncSession,
    source_with_key: dict,
    senior_agent: dict,
    no_update_rules: dict[str, EscalationRule],
) -> None:
    """Aegis #1249: a regra original passou a ignorar prioridade baixa."""
    ticket_id = await _ingest_stale_ticket(
        client, db_session, source_with_key["api_key"], priority="low"
    )

    result = await EscalationService(db_session).run()

    original_hits = [
        a for a in result["actions_taken"] if _NO_UPDATE_RULE in a and "baixa" not in a
    ]
    assert not any(f"ticket#{ticket_id}" in a for a in original_hits)

    msg_result = await db_session.execute(
        select(TicketMessage).where(TicketMessage.ticket_id == ticket_id)
    )
    notes = msg_result.scalars().all()
    assert len(notes) == 1
    assert _NO_UPDATE_LOW_RULE in notes[0].body


@pytest.mark.asyncio
async def test_no_update_rule_still_fires_for_high_priority(
    client: AsyncClient,
    db_session: AsyncSession,
    source_with_key: dict,
    senior_agent: dict,
    no_update_rules: dict[str, EscalationRule],
) -> None:
    ticket_id = await _ingest_stale_ticket(
        client, db_session, source_with_key["api_key"], priority="high"
    )

    result = await EscalationService(db_session).run()

    assert any(
        f"ticket#{ticket_id}" in a and _NO_UPDATE_RULE in a for a in result["actions_taken"]
    )
    msg_result = await db_session.execute(
        select(TicketMessage).where(TicketMessage.ticket_id == ticket_id)
    )
    notes = msg_result.scalars().all()
    assert len(notes) == 1
    assert notes[0].escalation_rule_id is not None


@pytest.mark.asyncio
async def test_repeated_escalation_updates_existing_note_instead_of_piling_up(
    client: AsyncClient,
    db_session: AsyncSession,
    source_with_key: dict,
    senior_agent: dict,
    no_update_rules: dict[str, EscalationRule],
) -> None:
    """Aegis #1249, item 3: disparos repetidos da mesma regra no mesmo ticket
    devem atualizar a nota existente, não criar uma nova a cada vez."""
    ticket_id = await _ingest_stale_ticket(
        client, db_session, source_with_key["api_key"], priority="urgent"
    )
    ticket = (
        await db_session.execute(select(Ticket).where(Ticket.id == ticket_id))
    ).scalar_one()
    rule = no_update_rules["high"]
    service = EscalationService(db_session)

    now1 = datetime.now(tz=UTC)
    desc1 = await service._apply_action(rule, ticket, now1)
    await service._log_escalation(rule, ticket.id, now1)
    assert desc1 is not None

    now2 = now1 + timedelta(hours=25)  # past the rule's cooldown
    desc2 = await service._apply_action(rule, ticket, now2)
    await service._log_escalation(rule, ticket.id, now2)
    assert desc2 is not None

    msg_result = await db_session.execute(
        select(TicketMessage).where(
            TicketMessage.ticket_id == ticket_id,
            TicketMessage.escalation_rule_id == rule.id,
        )
    )
    notes = msg_result.scalars().all()
    assert len(notes) == 1, "esperava 1 nota reaproveitada, não uma por disparo"
    assert "nº 2" in notes[0].body
