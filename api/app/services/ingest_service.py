from __future__ import annotations

import base64
import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.source import Source
from app.models.ticket import Ticket
from app.models.ticket_event import TicketEvent
from app.models.ticket_message import TicketMessage
from app.schemas.ingest import TicketEventPayload, TicketIngestPayload
from app.services.attachment_service import AttachmentService
from app.services.sla_service import SlaService

# GF native status → Aegis status (reverse of AegisWebhookController map)
_GF_TO_AEGIS: dict[str, str] = {
    "em_atendimento":              "in_progress",
    "aguardando_cliente":          "waiting_client",
    "aguardando_validacao_cliente": "pending_closure",
    "resolvido":                   "resolved",
    "fechado":                     "closed",
    "cancelado":                   "cancelled",
}

logger = logging.getLogger(__name__)


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
            ingested_at = datetime.now(UTC)
            sla_due_at = (
                ingested_at + timedelta(hours=source.sla_hours)
                if source.sla_hours
                else None
            )
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
                sla_due_at=sla_due_at,
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
        old_status = ticket.status
        ticket.status = data.status
        ticket.priority = data.priority
        ticket.type = data.type
        ticket.subject = data.subject
        ticket.description = data.description
        ticket.source_metadata = data.source_metadata
        ticket.source_updated_at = data.source_updated_at
        ticket.last_synced_at = datetime.now(UTC)

        if old_status != ticket.status:
            await SlaService(self._db).on_status_changed(
                ticket, old_status, ticket.status, datetime.now(UTC)
            )

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

        # Cleanse payload for storage in events table (remove huge base64 strings)
        cleansed_payload = None
        if data.payload:
            import copy

            cleansed_payload = copy.deepcopy(data.payload)
            if "attachments" in cleansed_payload:
                for att in cleansed_payload["attachments"]:
                    if "data" in att:
                        # Keep a hint of size but remove the blob
                        att["data"] = f"[base64 removed, length: {len(att['data'])}]"

        event = TicketEvent(
            ticket_id=ticket.id,
            event_type=data.event_type,
            payload=cleansed_payload,
            occurred_at=data.occurred_at or datetime.now(UTC),
        )
        self._db.add(event)

        # When the source system sends a client reply, store it as a conversation message
        if data.event_type == "client_reply" and data.payload:
            body = data.payload.get("body")
            author_name = data.payload.get("author_name", "Client")
            source_message_id = str(data.payload.get("source_message_id", "")) or None

            if body:
                # Dedup: skip if this source_message_id already exists for this ticket
                should_create = True
                if source_message_id:
                    from sqlalchemy import select as _select

                    dup = await self._db.execute(
                        _select(TicketMessage).where(
                            TicketMessage.ticket_id == ticket.id,
                            TicketMessage.source_message_id == source_message_id,
                        )
                    )
                    if dup.scalar_one_or_none() is not None:
                        should_create = False

                if should_create:
                    message = TicketMessage(
                        ticket_id=ticket.id,
                        direction="inbound",
                        author_name=author_name,
                        body=body,
                        source_message_id=source_message_id,
                    )
                    self._db.add(message)
                    await self._db.flush()

                    # Process attachments sent along with the reply
                    attachments = data.payload.get("attachments") or []
                    att_service = AttachmentService(self._db)
                    for att in attachments:
                        try:
                            raw = base64.b64decode(att["data"])
                            await att_service.store_from_bytes(
                                ticket_id=ticket.id,
                                filename=att["filename"],
                                content_type=att["content_type"],
                                content=raw,
                                message_id=message.id,
                            )
                        except Exception:
                            logger.warning(
                                "ingest: failed to store attachment '%s' for ticket %s",
                                att.get("filename"),
                                ticket.id,
                                exc_info=True,
                            )

        # When the source system reports a status change, update the Aegis ticket
        if data.event_type == "status_changed" and data.payload:
            gf_status = data.payload.get("status")
            aegis_status = _GF_TO_AEGIS.get(gf_status) if gf_status else None
            if aegis_status and ticket.status != aegis_status:
                old_status = ticket.status
                ticket.status = aegis_status
                ticket.last_synced_at = datetime.now(UTC)
                await SlaService(self._db).on_status_changed(
                    ticket, old_status, aegis_status, datetime.now(UTC)
                )
                logger.info(
                    "ingest: ticket %s status updated %s → %s (via GF event)",
                    ticket.external_id,
                    old_status,
                    aegis_status,
                )
            elif not aegis_status and gf_status:
                logger.debug(
                    "ingest: GF status '%s' has no Aegis mapping — skipped for ticket %s",
                    gf_status,
                    ticket.external_id,
                )

        await self._db.commit()
        await self._db.refresh(event)
        return event
