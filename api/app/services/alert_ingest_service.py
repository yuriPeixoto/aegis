from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert_event import AlertEvent
from app.models.source import Source
from app.models.ticket import Ticket
from app.models.ticket_event import TicketEvent
from app.schemas.ingest import AlertIngestPayload, AlertResult, AlertStatus
from app.services.alert_source_policy import apply_alert_source_policy, start_alert_sla
from app.services.ingest_service import IngestService
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)

# A ticket in one of these is no longer "the open ticket" of its problem: the next
# firing event of the same fingerprint opens a new ticket linked to it.
CLOSED_STATUSES = ("resolved", "closed", "cancelled", "merged")

_INITIAL_STATUS = "open"
_MAX_ATTEMPTS = 2  # one retry after losing a race on a unique constraint


class AlertConflictError(Exception):
    """The alert could not be applied after retrying (e.g. its event_id is already
    the external_id of a ticket this source sent through /v1/ingest/tickets)."""


@dataclass(frozen=True)
class AlertOutcome:
    result: AlertResult
    ticket: Ticket | None
    previous_ticket_id: int | None = None


class AlertIngestService:
    """Alert contract v1 (docs/alert-ingest.md, ADR-013): one ticket per problem
    while it is open, idempotent by event_id."""

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def ingest(self, source: Source, data: AlertIngestPayload) -> AlertOutcome:
        for attempt in range(1, _MAX_ATTEMPTS + 1):
            try:
                outcome = await self._apply(source, data)
                await self._db.commit()
            except IntegrityError:
                # Another delivery of the same event, or a concurrent first
                # occurrence of the same problem, committed first. Start over:
                # the second pass sees its row.
                await self._db.rollback()
                await self._db.refresh(source)  # the rollback expired it
                logger.info(
                    "alert ingest: lost a race on event %s (source %s, attempt %d)",
                    data.event_id,
                    source.slug,
                    attempt,
                )
                continue
            if outcome.result is AlertResult.CREATED and outcome.ticket is not None:
                await self._after_create(source, outcome.ticket)
            return outcome
        raise AlertConflictError(data.event_id)

    async def _apply(self, source: Source, data: AlertIngestPayload) -> AlertOutcome:
        duplicate = await self._find_processed_event(source, data.event_id)
        if duplicate is not None:
            ticket = (
                await self._db.get(Ticket, duplicate.ticket_id) if duplicate.ticket_id else None
            )
            return AlertOutcome(AlertResult.DUPLICATE, ticket)

        open_ticket, latest = await self._find_tickets_of_problem(source, data.fingerprint)
        occurred_at = data.occurred_at or datetime.now(UTC)

        if data.status is AlertStatus.RESOLVED:
            if open_ticket is None:
                outcome = AlertOutcome(AlertResult.IGNORED, None)
            else:
                self._add_event(open_ticket, "alert_resolved", data, occurred_at)
                outcome = AlertOutcome(AlertResult.RESOLVED_NOTED, open_ticket)
        elif open_ticket is not None:
            self._add_occurrence(open_ticket, data, occurred_at)
            outcome = AlertOutcome(AlertResult.OCCURRENCE, open_ticket)
        else:
            ticket = await self._create_ticket(source, data, occurred_at, latest)
            outcome = AlertOutcome(
                AlertResult.CREATED, ticket, latest.id if latest is not None else None
            )

        self._db.add(
            AlertEvent(
                source_id=source.id,
                event_id=data.event_id,
                fingerprint=data.fingerprint,
                ticket_id=outcome.ticket.id if outcome.ticket is not None else None,
                result=outcome.result.value,
            )
        )
        await self._db.flush()
        return outcome

    async def _find_processed_event(self, source: Source, event_id: str) -> AlertEvent | None:
        result = await self._db.execute(
            select(AlertEvent).where(
                AlertEvent.source_id == source.id, AlertEvent.event_id == event_id
            )
        )
        return result.scalar_one_or_none()

    async def _find_tickets_of_problem(
        self, source: Source, fingerprint: str
    ) -> tuple[Ticket | None, Ticket | None]:
        """(open ticket, most recent ticket) of this problem. The open ticket is
        locked until commit, so concurrent occurrences are counted one at a time."""
        result = await self._db.execute(
            select(Ticket)
            .where(
                Ticket.source_id == source.id,
                Ticket.alert_fingerprint == fingerprint,
                Ticket.status.notin_(CLOSED_STATUSES),
            )
            .with_for_update()
        )
        open_ticket = result.scalar_one_or_none()
        if open_ticket is not None:
            return open_ticket, open_ticket

        result = await self._db.execute(
            select(Ticket)
            .where(Ticket.source_id == source.id, Ticket.alert_fingerprint == fingerprint)
            .order_by(Ticket.id.desc())
            .limit(1)
        )
        latest = result.scalar_one_or_none()
        if latest is None or latest.merged_into_ticket_id is None:
            return None, latest

        # The last ticket of this problem was merged into another one (#1287): while
        # that one is open, the problem lives there.
        active = await IngestService(self._db).resolve_active_ticket(latest)
        if active.status in CLOSED_STATUSES:
            return None, latest
        return active, latest

    def _add_occurrence(
        self, ticket: Ticket, data: AlertIngestPayload, occurred_at: datetime
    ) -> None:
        ticket.occurrence_count += 1
        ticket.last_occurrence_at = occurred_at
        self._add_event(ticket, "alert_occurrence", data, occurred_at)

    async def _create_ticket(
        self,
        source: Source,
        data: AlertIngestPayload,
        occurred_at: datetime,
        previous: Ticket | None,
    ) -> Ticket:
        ticket = Ticket(
            source_id=source.id,
            external_id=data.event_id,
            type=data.type,
            priority=data.priority.value,
            status=_INITIAL_STATUS,
            subject=data.subject,
            description=data.description,
            source_metadata=data.metadata,
            source_created_at=data.occurred_at,
            alert_fingerprint=data.fingerprint,
            occurrence_count=1,
            last_occurrence_at=occurred_at,
            previous_ticket_id=previous.id if previous is not None else None,
        )
        await start_alert_sla(self._db, source, ticket)
        self._db.add(ticket)
        await self._db.flush()

        self._add_event(ticket, "created", data, occurred_at)
        if previous is not None:
            self._db.add(
                TicketEvent(
                    ticket_id=previous.id,
                    event_type="alert_recurred",
                    payload={"event_id": data.event_id, "new_ticket_id": ticket.id},
                    occurred_at=occurred_at,
                )
            )
        return ticket

    def _add_event(
        self, ticket: Ticket, event_type: str, data: AlertIngestPayload, occurred_at: datetime
    ) -> None:
        self._db.add(
            TicketEvent(
                ticket_id=ticket.id,
                event_type=event_type,
                payload=data.model_dump(mode="json"),
                occurred_at=occurred_at,
            )
        )

    async def _after_create(self, source: Source, ticket: Ticket) -> None:
        await self._db.refresh(ticket)
        await NotificationService(self._db).create_new_ticket_notifications(ticket, source.name)
        await apply_alert_source_policy(self._db, source, ticket)
