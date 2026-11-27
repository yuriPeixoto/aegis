from __future__ import annotations

import logging
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.source import Source
from app.models.tag import Tag
from app.models.ticket import Ticket
from app.models.user import User
from app.services.notification_service import NotificationService
from app.services.sla_service import SlaService

logger = logging.getLogger(__name__)


async def start_alert_sla(db: AsyncSession, source: Source, ticket: Ticket) -> None:
    """Alert sources start the SLA clock at creation (#1468–#1470). Mutates the
    ticket; the caller commits."""
    if not source.is_alert:
        return
    await SlaService(db).start_clock(ticket, datetime.now(UTC))


async def apply_alert_source_policy(db: AsyncSession, source: Source, ticket: Ticket) -> None:
    """Run once, right after an alert source's ticket is created (and committed):
    apply the source's tag and send the blocking "critical source" notification
    (#1086) to its recipient. Both are optional per source (sources.alert_tag_id,
    sources.alert_recipient_user_id)."""
    if not source.is_alert:
        return

    if source.alert_tag_id is not None:
        tag = await db.get(Tag, source.alert_tag_id)
        if tag is not None:
            await db.refresh(ticket, ["tags"])
            if tag not in ticket.tags:
                ticket.tags.append(tag)
            await db.commit()

    if source.alert_recipient_user_id is None:
        return
    recipient = await db.get(User, source.alert_recipient_user_id)
    if recipient is None or not recipient.is_active:
        logger.warning(
            "ingest: alert recipient user %s of source '%s' not found or inactive — "
            "skipping notification for ticket %s",
            source.alert_recipient_user_id,
            source.slug,
            ticket.external_id,
        )
        return
    await NotificationService(db).create_critical_source_notification(
        ticket, recipient.id, source.name
    )
