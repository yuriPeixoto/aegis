from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.source import Source
from app.models.ticket import Ticket
from app.models.ticket_event import TicketEvent
from app.schemas.ingest import TicketEventPayload, TicketIngestPayload


class IngestService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def upsert_ticket(self, source: Source, data: TicketIngestPayload) -> tuple[Ticket, bool]:
        """
        Create or update a ticket from a source payload.
        Returns (ticket, created) where created=True means a new ticket was inserted.
        """
        result = await self._db.execute(
            select(Ticket).where(
                Ticket.source_id == source.id,
                Ticket.external_id == data.external_id,
            )
        )
        ticket = result.scalar_one_or_none()

        if ticket is None:
            ticket = Ticket(
                source_id=source.id,
                external_id=data.external_id,
                type=data.type,
                priority=data.priority,
                status=data.status,
                subject=data.subject,
                description=data.description,
                source_metadata=data.source_metadata,
                source_created_at=data.source_created_at,
                source_updated_at=data.source_updated_at,
            )
            self._db.add(ticket)
            await self._db.flush()  # get the id without committing

            # Record the creation event
            self._db.add(
                TicketEvent(
                    ticket_id=ticket.id,
                    event_type="created",
                    payload=data.model_dump(mode="json"),
                    occurred_at=data.source_created_at or datetime.now(UTC),
                )
            )
            await self._db.commit()
            await self._db.refresh(ticket)
            return ticket, True

        # Update existing ticket
        ticket.status = data.status
        ticket.priority = data.priority
        ticket.type = data.type
        ticket.subject = data.subject
        ticket.description = data.description
        ticket.source_metadata = data.source_metadata
        ticket.source_updated_at = data.source_updated_at
        ticket.last_synced_at = datetime.now(UTC)

        self._db.add(
            TicketEvent(
                ticket_id=ticket.id,
                event_type="synced",
                payload=data.model_dump(mode="json"),
                occurred_at=data.source_updated_at or datetime.now(UTC),
            )
        )
        await self._db.commit()
        await self._db.refresh(ticket)
        return ticket, False

    async def record_event(self, source: Source, data: TicketEventPayload) -> TicketEvent:
        """
        Record a discrete event (status change, response added, etc.) for an existing ticket.
        Creates the ticket if it doesn't exist yet (defensive — source may send events before
        the initial ingest in rare race conditions).
        """
        result = await self._db.execute(
            select(Ticket).where(
                Ticket.source_id == source.id,
                Ticket.external_id == data.external_id,
            )
        )
        ticket = result.scalar_one_or_none()

        if ticket is None:
            # Defensive: create a minimal ticket record
            ticket = Ticket(
                source_id=source.id,
                external_id=data.external_id,
                status="unknown",
                subject=f"[auto-created from event] {data.external_id}",
            )
            self._db.add(ticket)
            await self._db.flush()

        event = TicketEvent(
            ticket_id=ticket.id,
            event_type=data.event_type,
            payload=data.payload,
            occurred_at=data.occurred_at or datetime.now(UTC),
        )
        self._db.add(event)
        await self._db.commit()
        await self._db.refresh(event)
        return event
