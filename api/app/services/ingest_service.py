from __future__ import annotations

import base64
import copy
import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.source import Source
from app.models.tag import Tag
from app.models.ticket import Ticket
from app.models.ticket_event import TicketEvent
from app.models.ticket_message import TicketMessage
from app.models.user import User
from app.schemas.ingest import TicketEventPayload, TicketIngestPayload
from app.services.attachment_service import AttachmentService
from app.services.checklist_service import ChecklistService
from app.services.notification_service import NotificationService
from app.services.sla_service import SlaService

# Source.slug -> (tag name, recipient email). A ticket created by one of these
# sources gets the tag auto-applied and a blocking notification (see #1086) sent
# to the recipient, once, at creation. Extend here for Cronwatch when it's ready
# (#1271) — same mechanism, new slug/tag/recipient entry.
_CRITICAL_SOURCE_ALERTS: dict[str, tuple[str, str]] = {
    "log-watcher": ("Log Watcher", "yuripeixoto@gmail.com"),
}

# GF native status → Aegis status (reverse of AegisWebhookController map)
#
# NOTE: "em_atendimento" is deliberately NOT mapped here. Per
# docs/gf-ticket-client-refactor.md §3.4, the GF client portal still lets the
# client themselves flip a ticket to "em_atendimento" (known issue, pending a
# GF-side fix that removes that control from the client). Until that lands,
# Aegis must not treat an inbound "em_atendimento" event as authoritative for
# starting work — the transition into in_progress is an Aegis-agent decision,
# made explicitly via the dashboard (PATCH /{ticket_id}/status), not something
# a client action on the source system should trigger. The event is still
# recorded in the ticket's history for visibility; it just doesn't move the
# actual status.
_GF_TO_AEGIS: dict[str, str] = {
    "aguardando_cliente": "pending_closure",
    "aguardando_validacao_cliente": "pending_closure",
    "resolvido": "resolved",
    "fechado": "closed",
    "cancelado": "cancelled",
}

# The two GF statuses that both collapse into "pending_closure" above but mean opposite
# things ("aguardando_cliente" = team is waiting on the client to reply; "aguardando_
# validacao_cliente" = ticket is done, client needs to confirm). Tracked in
# ticket.source_metadata["gf_status_raw"] so the frontend can disambiguate.
_AMBIGUOUS_GF_STATUSES = {"aguardando_cliente", "aguardando_validacao_cliente"}

logger = logging.getLogger(__name__)


def _cleanse_attachments_for_event(payload: dict | None) -> dict | None:
    """Strip base64 blobs from attachment payloads before storing in ticket_events —
    keeps a size hint but drops the `data` field, which otherwise buries the
    Histórico de Eventos sidebar under a wall of base64."""
    if not payload or "attachments" not in payload:
        return payload
    cleansed = copy.deepcopy(payload)
    for att in cleansed["attachments"]:
        if "data" in att:
            att["data"] = f"[base64 removed, length: {len(att['data'])}]"
    return cleansed


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
                ingested_at + timedelta(hours=source.sla_hours) if source.sla_hours else None
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
                assigned_to_user_id=data.assigned_to_user_id,
            )
            self._db.add(ticket)
            await self._db.flush()  # get the id without committing

            # Record the creation event
            self._db.add(
                TicketEvent(
                    ticket_id=ticket.id,
                    event_type="created",
                    payload=_cleanse_attachments_for_event(data.model_dump(mode="json")),
                    occurred_at=data.source_created_at or datetime.now(UTC),
                )
            )
            await self._db.commit()
            await self._db.refresh(ticket)

            if data.attachments:
                att_service = AttachmentService(self._db)
                stored, failed = 0, 0
                for att in data.attachments:
                    try:
                        raw = base64.b64decode(att.data)
                        await att_service.store_from_bytes(
                            ticket_id=ticket.id,
                            filename=att.filename,
                            content_type=att.content_type,
                            content=raw,
                        )
                        stored += 1
                    except Exception:
                        failed += 1
                        logger.warning(
                            "ingest: failed to store attachment '%s' for ticket %s",
                            att.filename,
                            ticket.id,
                            exc_info=True,
                        )
                logger.info(
                    "ingest: ticket %s — %d/%d initial attachments stored%s",
                    ticket.external_id,
                    stored,
                    len(data.attachments),
                    f" ({failed} failed — check warnings above)" if failed else "",
                )

            if data.checklist_items:
                await ChecklistService(self._db).create_items_bulk(ticket.id, data.checklist_items)
                await self._db.commit()

            await NotificationService(self._db).create_new_ticket_notifications(ticket, source.name)

            alert = _CRITICAL_SOURCE_ALERTS.get(source.slug)
            if alert:
                tag_name, recipient_email = alert
                await self._apply_critical_source_alert(
                    ticket, tag_name, recipient_email, source.name
                )

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
                payload=_cleanse_attachments_for_event(data.model_dump(mode="json")),
                occurred_at=data.source_updated_at or datetime.now(UTC),
            )
        )
        await self._db.commit()
        await self._db.refresh(ticket)
        return ticket, False

    async def _apply_critical_source_alert(
        self, ticket: Ticket, tag_name: str, recipient_email: str, source_name: str
    ) -> None:
        """Auto-tag the ticket and notify the recipient — see _CRITICAL_SOURCE_ALERTS."""
        tag_result = await self._db.execute(select(Tag).where(Tag.name == tag_name))
        tag = tag_result.scalar_one_or_none()
        if tag is None:
            tag = Tag(name=tag_name)
            self._db.add(tag)
            await self._db.flush()

        await self._db.refresh(ticket, ["tags"])
        if tag not in ticket.tags:
            ticket.tags.append(tag)

        user_result = await self._db.execute(select(User).where(User.email == recipient_email))
        recipient = user_result.scalar_one_or_none()
        if recipient is None:
            logger.warning(
                "ingest: critical source alert recipient '%s' not found — "
                "skipping notification for ticket %s (tag '%s' still applied)",
                recipient_email,
                ticket.external_id,
                tag_name,
            )
            await self._db.commit()
            return

        await self._db.commit()
        await NotificationService(self._db).create_critical_source_notification(
            ticket, recipient.id, source_name
        )

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
        cleansed_payload = _cleanse_attachments_for_event(data.payload)

        event = TicketEvent(
            ticket_id=ticket.id,
            event_type=data.event_type,
            payload=cleansed_payload,
            occurred_at=data.occurred_at or datetime.now(UTC),
        )
        self._db.add(event)

        # When the source system sends a client reply, store it as a conversation message
        new_client_message_author: str | None = None
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

                    new_client_message_author = author_name

        # When the source system reports a status change, update the Aegis ticket
        if data.event_type == "status_changed" and data.payload:
            gf_status = data.payload.get("status")
            aegis_status = _GF_TO_AEGIS.get(gf_status) if gf_status else None
            if aegis_status and ticket.status != aegis_status:
                old_status = ticket.status
                ticket.status = aegis_status
                ticket.last_synced_at = datetime.now(UTC)
                # aguardando_cliente e aguardando_validacao_cliente colapsam ambos em
                # "pending_closure" (ADR-003) — guarda o status bruto do GF para o
                # front-end distinguir os dois casos sem reabrir a lógica de SLA.
                if gf_status in _AMBIGUOUS_GF_STATUSES:
                    ticket.source_metadata = {
                        **(ticket.source_metadata or {}),
                        "gf_status_raw": gf_status,
                    }
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

        # When the client submits a CSAT rating, store it on the ticket
        if data.event_type == "csat_submitted" and data.payload:
            rating = data.payload.get("rating")
            comment = data.payload.get("comment")
            if isinstance(rating, int) and 1 <= rating <= 5:
                ticket.csat_rating = rating
                ticket.csat_comment = comment
                ticket.csat_submitted_at = data.occurred_at or datetime.now(UTC)
                logger.info(
                    "ingest: CSAT rating %d recorded for ticket %s",
                    rating,
                    ticket.external_id,
                )
            else:
                logger.warning(
                    "ingest: invalid CSAT rating '%s' for ticket %s — skipped",
                    rating,
                    ticket.external_id,
                )

        await self._db.commit()
        await self._db.refresh(event)

        if new_client_message_author is not None:
            await NotificationService(self._db).create_new_message_notifications(
                ticket, new_client_message_author
            )

        return event
