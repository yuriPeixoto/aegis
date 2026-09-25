"""Guarantees that any change to Ticket.status is relayed to the source system's
webhook, no matter which code path made the change.

This exists because the previous convention — "whichever router changes a
ticket's status remembers to call dispatch_webhook itself" — kept getting
missed: merge_ticket() never called it (Aegis #1437), AutoCloseService never
called it, and bulk_update() called it under the wrong event_type
("status_updated" instead of "status_changed", which the GF-side webhook
receiver doesn't recognize). Hooking at the SQLAlchemy Session level catches
all of these uniformly, including future code and standalone scripts (e.g.
run_auto_close.py) that mutate Ticket.status directly — mirrors the guarantee
SupportTicketObserver gives on the GF side (see Aegis #1436).

To attach a human-readable name to a change (otherwise it's reported to the
source system as "Aegis"), set `ticket._status_change_actor` on the instance
before the session is committed.
"""

from __future__ import annotations

import asyncio
import logging

from sqlalchemy import event, inspect, select
from sqlalchemy.orm import Session, selectinload

from app.core.database import AsyncSessionLocal
from app.models.ticket import Ticket
from app.services.status_mapping import status_for_source
from app.services.webhook_service import dispatch_webhook

logger = logging.getLogger(__name__)

_PENDING_KEY = "_ticket_status_changes"


@event.listens_for(Session, "before_flush")
def _collect_ticket_status_changes(
    session: Session, flush_context: object, instances: object
) -> None:
    pending: dict[int, tuple[str, str | None, str, str | None]] = session.info.setdefault(
        _PENDING_KEY, {}
    )

    for obj in session.dirty:
        if not isinstance(obj, Ticket) or obj.id is None:
            continue

        history = inspect(obj).attrs.status.history
        if not history.has_changes():
            continue

        old_status = history.deleted[0] if history.deleted else None
        new_status = history.added[0] if history.added else obj.status
        if old_status == new_status:
            continue

        actor_name = getattr(obj, "_status_change_actor", None)
        # Last write for a given ticket within the same transaction wins —
        # what matters for the source system is where the ticket ended up.
        pending[obj.id] = (obj.external_id, old_status, new_status, actor_name)


@event.listens_for(Session, "after_commit")
def _dispatch_ticket_status_changes(session: Session) -> None:
    pending = session.info.pop(_PENDING_KEY, None)
    if not pending:
        return

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        logger.error(
            "ticket_sync_hooks: no running event loop — %d status change(s) not relayed to source",
            len(pending),
        )
        return

    for ticket_id, (external_id, old_status, new_status, actor_name) in pending.items():
        loop.create_task(
            _notify_source_of_status_change(
                ticket_id, external_id, old_status, new_status, actor_name
            )
        )


async def _notify_source_of_status_change(
    ticket_id: int,
    external_id: str,
    old_status: str | None,
    new_status: str,
    actor_name: str | None,
) -> None:
    # Deliberately opens its own session — the session that triggered this commit
    # may already be closing by the time this task actually runs.
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Ticket).where(Ticket.id == ticket_id).options(selectinload(Ticket.source))
        )
        ticket = result.scalar_one_or_none()

    if ticket is None or ticket.source is None or not ticket.source.webhook_url:
        return

    reported_status = status_for_source(new_status)

    # dispatch_webhook already catches and logs its own failures — nothing to
    # add here beyond letting the (already logged) old_status show up if we
    # ever need to correlate a delivery failure back to the transition.
    logger.debug(
        "ticket_sync_hooks: relaying %s -> %s for ticket %s", old_status, new_status, external_id
    )
    await dispatch_webhook(
        webhook_url=ticket.source.webhook_url,
        webhook_secret=ticket.source.webhook_secret,
        event_type="status_changed",
        payload={
            "external_id": external_id,
            "status": reported_status,
            "changed_by": actor_name or "Aegis",
        },
        webhook_url_internal=ticket.source.webhook_url_internal,
    )
