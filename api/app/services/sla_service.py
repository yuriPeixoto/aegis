from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.business_hours import BusinessHoursConfig
from app.models.sla_policy import SlaPolicy
from app.models.ticket import Ticket
from app.services.business_hours_service import BusinessHoursService

logger = logging.getLogger(__name__)

_TERMINAL = {"pending_closure", "resolved", "closed", "cancelled"}


class SlaService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._bh = BusinessHoursService()

    async def on_status_changed(
        self,
        ticket: Ticket,
        old_status: str,
        new_status: str,
        changed_at: datetime,  # UTC
    ) -> None:
        """
        Called by TicketService.update_ticket_status immediately after the
        status change, before committing.  Mutates `ticket` in place.
        """
        if new_status == "in_progress":
            if ticket.sla_started_at is None:
                await self._start(ticket, changed_at)
            elif old_status == "waiting_client" and ticket.sla_paused_since:
                self._resume(ticket, changed_at)

        elif new_status == "waiting_client":
            self._pause(ticket, changed_at)

        elif new_status in _TERMINAL:
            self._finalize(ticket, changed_at)

    async def override_due_at(
        self,
        ticket: Ticket,
        new_due_at: datetime,  # UTC
    ) -> None:
        """Directly set sla_due_at (admin/manager override)."""
        ticket.sla_due_at = new_due_at

    # ── private ───────────────────────────────────────────────────────────────

    async def _start(self, ticket: Ticket, now: datetime) -> None:
        config = await self._get_config()
        policy = await self._get_policy(ticket.priority)
        if config is None or policy is None:
            logger.warning(
                "sla: no config/policy for ticket %s (priority=%s) — SLA not started",
                ticket.id,
                ticket.priority,
            )
            return

        ticket.sla_started_at = now
        ticket.sla_paused_seconds = 0
        ticket.sla_paused_since = None
        ticket.sla_due_at = self._bh.add_business_hours(now, policy.resolution_hours, config)
        logger.info(
            "sla: started for ticket %s — due at %s (%dh business)",
            ticket.id,
            ticket.sla_due_at,
            policy.resolution_hours,
        )

    def _pause(self, ticket: Ticket, now: datetime) -> None:
        if ticket.sla_paused_since is None and ticket.sla_due_at is not None:
            ticket.sla_paused_since = now

    def _resume(self, ticket: Ticket, now: datetime) -> None:
        if ticket.sla_paused_since and ticket.sla_due_at:
            paused_seconds = (now - ticket.sla_paused_since).total_seconds()
            ticket.sla_paused_seconds = (ticket.sla_paused_seconds or 0) + int(paused_seconds)
            ticket.sla_paused_since = None
            # Extend the deadline by the wall-clock time spent waiting
            ticket.sla_due_at = ticket.sla_due_at + timedelta(seconds=paused_seconds)

    def _finalize(self, ticket: Ticket, now: datetime) -> None:
        """Flush any in-flight pause on terminal transition."""
        if ticket.sla_paused_since and ticket.sla_due_at:
            paused_seconds = (now - ticket.sla_paused_since).total_seconds()
            ticket.sla_paused_seconds = (ticket.sla_paused_seconds or 0) + int(paused_seconds)
            ticket.sla_paused_since = None

    async def _get_config(self) -> BusinessHoursConfig | None:
        result = await self._db.execute(
            select(BusinessHoursConfig).where(BusinessHoursConfig.id == 1)
        )
        return result.scalar_one_or_none()

    async def _get_policy(self, priority: str | None) -> SlaPolicy | None:
        if not priority:
            return None
        result = await self._db.execute(
            select(SlaPolicy).where(SlaPolicy.priority == priority.lower())
        )
        return result.scalar_one_or_none()
