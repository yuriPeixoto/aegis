from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.global_setting import GlobalSetting
from app.models.ticket import Ticket
from app.models.ticket_event import TicketEvent
from app.models.ticket_message import TicketMessage

logger = logging.getLogger(__name__)


class AutoCloseService:
    """Service to handle automatic ticket closure due to inactivity."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_settings(self) -> dict[str, str]:
        """Fetch all auto-close related settings from the database."""
        stmt = select(GlobalSetting).where(GlobalSetting.key.like("auto_close_%"))
        result = await self.db.execute(stmt)
        return {row.key: row.value for row in result.scalars()}

    async def process_auto_close(self) -> dict[str, int]:
        """Identifies and processes tickets that should be warned or closed."""
        settings = await self.get_settings()
        
        if settings.get("auto_close_enabled") != "true":
            logger.info("Auto-close is disabled.")
            return {"closed": 0, "warned": 0}

        wait_days = int(settings.get("auto_close_wait_days", 5))
        warning_days = int(settings.get("auto_close_warning_days", 3))
        close_msg = settings.get("auto_close_message", "")
        warning_msg = settings.get("auto_close_warning_message", "")

        now = datetime.now(UTC)
        close_threshold = now - timedelta(days=wait_days)
        warning_threshold = now - timedelta(days=warning_days)

        # 1. Tickets to CLOSE
        # Logic: In status 'waiting_client' and (last interaction or ingestion) > wait_days
        # Also ensure we only close if we already sent a warning or if warning is not applicable.
        # For simplicity, we check if last interaction > wait_days.
        close_stmt = select(Ticket).where(
            Ticket.status == "waiting_client",
            Ticket.last_synced_at <= close_threshold
        )
        to_close_result = await self.db.execute(close_stmt)
        tickets_to_close = to_close_result.scalars().all()

        closed_count = 0
        for ticket in tickets_to_close:
            # Send message to client
            new_msg = TicketMessage(
                ticket_id=ticket.id,
                direction="outbound",
                author_name="Aegis System",
                body=close_msg,
                created_at=now
            )
            self.db.add(new_msg)

            # Record event
            event = TicketEvent(
                ticket_id=ticket.id,
                event_type="auto_closed",
                payload={"reason": "inactivity", "days_inactive": wait_days},
                occurred_at=now
            )
            self.db.add(event)

            # Update ticket
            old_status = ticket.status
            ticket.status = "resolved"
            ticket.resolved_at = now
            ticket.last_synced_at = now
            
            # Update SLA clock if needed
            from app.services.sla_service import SlaService
            await SlaService(self.db).on_status_changed(ticket, old_status, "resolved", now)
            
            closed_count += 1

        # 2. Tickets to WARN
        # Logic: In status 'waiting_client', last interaction > warning_days, 
        # AND haven't received a warning yet.
        # We check the existence of a 'auto_warning_sent' event to avoid duplicates.
        warn_stmt = select(Ticket).where(
            Ticket.status == "waiting_client",
            Ticket.last_synced_at <= warning_threshold,
            Ticket.last_synced_at > close_threshold # Don't warn if already in close range
        )
        to_warn_result = await self.db.execute(warn_stmt)
        tickets_to_warn = to_warn_result.scalars().all()

        warned_count = 0
        for ticket in tickets_to_warn:
            # Check if warning was already sent
            check_event = await self.db.execute(
                select(TicketEvent).where(
                    TicketEvent.ticket_id == ticket.id,
                    TicketEvent.event_type == "auto_warning_sent"
                ).limit(1)
            )
            if check_event.scalar_one_or_none():
                continue

            # Send warning message
            new_msg = TicketMessage(
                ticket_id=ticket.id,
                direction="outbound",
                author_name="Aegis System",
                body=warning_msg,
                created_at=now
            )
            self.db.add(new_msg)

            # Record event
            event = TicketEvent(
                ticket_id=ticket.id,
                event_type="auto_warning_sent",
                payload={"days_inactive": warning_days},
                occurred_at=now
            )
            self.db.add(event)
            
            # Update last_synced_at to avoid immediate re-warning/closing? 
            # Or just rely on the event check.
            # ticket.last_synced_at = now # If we update last_synced_at, we reset the timer.
            # Better not update last_synced_at for warning, so the close timer keeps running.
            
            warned_count += 1

        await self.db.commit()
        return {"closed": closed_count, "warned": warned_count}
