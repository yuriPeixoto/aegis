from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.source import Source  # noqa: F401 — loaded via selectinload
from app.models.tag import Tag
from app.models.ticket import Ticket
from app.models.ticket_event import TicketEvent  # active — needed to create status_changed events
from app.models.ticket_message import TicketMessage
from app.models.user import User  # noqa: F401 — loaded via selectinload
from app.services.sla_service import SlaService

_ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "open":            {"in_progress", "cancelled"},
    "in_progress":     {"waiting_client", "pending_closure", "cancelled"},
    "waiting_client":  {"in_progress", "pending_closure", "cancelled"},
    "pending_closure": {"in_progress", "closed"},
    "resolved":        {"open", "closed"},   # mantido por retrocompatibilidade
    "closed":          set(),
    "cancelled":       set(),
}


class TicketService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    _TERMINAL_STATUSES = ('resolved', 'closed', 'cancelled')

    async def list_tickets(
        self,
        *,
        source_id: int | None = None,
        status: str | None = None,
        priority: str | None = None,
        type: str | None = None,
        assigned_to_user_id: int | None = None,
        unassigned: bool = False,
        active_only: bool = False,
        search: str | None = None,
        created_after: datetime | None = None,
        created_before: datetime | None = None,
        tag_ids: list[int] | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Ticket], int]:
        query = select(Ticket).join(Source, Ticket.source_id == Source.id).where(Source.is_active.is_(True))

        if tag_ids:
            # Filter tickets that have ALL specified tags (AND logic)
            # Or use ANY? Zendesk tags usually work as "has any of these" or "has all".
            # Let's start with "has any of these" for simpler filtering unless specified otherwise.
            from app.models.tag import ticket_tags
            query = query.join(Ticket.tags).where(Tag.id.in_(tag_ids))
            # If we wanted AND logic, we'd need multiple joins or a subquery with count.

        if source_id is not None:
            query = query.where(Ticket.source_id == source_id)
        if active_only:
            query = query.where(Ticket.status.notin_(self._TERMINAL_STATUSES))
        elif status is not None:
            query = query.where(Ticket.status == status)
        if priority is not None:
            query = query.where(Ticket.priority == priority)
        if type is not None:
            query = query.where(Ticket.type == type)
        if unassigned:
            query = query.where(Ticket.assigned_to_user_id.is_(None))
        elif assigned_to_user_id is not None:
            query = query.where(Ticket.assigned_to_user_id == assigned_to_user_id)
        if search is not None:
            term = f"%{search}%"
            from sqlalchemy import or_
            query = query.where(or_(Ticket.subject.ilike(term), Ticket.external_id.ilike(term)))
        if created_after is not None:
            query = query.where(Ticket.first_ingested_at >= created_after)
        if created_before is not None:
            query = query.where(Ticket.first_ingested_at <= created_before)

        count_result = await self._db.execute(select(func.count()).select_from(query.subquery()))
        total = count_result.scalar_one()

        # Terminal statuses sink to the bottom; within each group sort by priority then recency
        _terminal_rank = case(
            (Ticket.status.in_(self._TERMINAL_STATUSES), 1),
            else_=0,
        )
        _priority_rank = case(
            (Ticket.priority == "urgent", 1),
            (Ticket.priority == "high", 2),
            (Ticket.priority == "medium", 3),
            (Ticket.priority == "low", 4),
            else_=5,
        )
        result = await self._db.execute(
            query.options(
                selectinload(Ticket.source),
                selectinload(Ticket.assignee),
                selectinload(Ticket.tags)
            )
            .order_by(_terminal_rank, _priority_rank, Ticket.first_ingested_at.desc())
            .limit(limit)
            .offset(offset)
        )
        tickets = list(result.scalars().all())

        # Compute last inbound message timestamp per ticket in one query
        inbound_map: dict[int, datetime | None] = {}
        if tickets:
            ticket_ids = [t.id for t in tickets]
            inbound_result = await self._db.execute(
                select(
                    TicketMessage.ticket_id,
                    func.max(TicketMessage.created_at).label("last_inbound_at"),
                )
                .where(TicketMessage.ticket_id.in_(ticket_ids))
                .where(TicketMessage.direction == "inbound")
                .group_by(TicketMessage.ticket_id)
            )
            inbound_map = {row.ticket_id: row.last_inbound_at for row in inbound_result}

        return tickets, total, inbound_map

    async def get_ticket(self, ticket_id: int) -> Ticket | None:
        result = await self._db.execute(
            select(Ticket)
            .where(Ticket.id == ticket_id)
            .options(
                selectinload(Ticket.source),
                selectinload(Ticket.events),
                selectinload(Ticket.assignee),
                selectinload(Ticket.tags),
            )
        )
        return result.scalar_one_or_none()

    async def assign_ticket(self, ticket_id: int, user_id: int | None) -> Ticket | None:
        ticket = await self.get_ticket(ticket_id)
        if ticket is None:
            return None
        ticket.assigned_to_user_id = user_id
        await self._db.commit()
        await self._db.refresh(ticket)
        # Reload relationships after refresh
        result = await self._db.execute(
            select(Ticket)
            .where(Ticket.id == ticket_id)
            .options(
                selectinload(Ticket.source),
                selectinload(Ticket.events),
                selectinload(Ticket.assignee),
                selectinload(Ticket.tags),
            )
        )
        return result.scalar_one_or_none()

    async def update_ticket_status(
        self,
        ticket_id: int,
        new_status: str,
        changed_by_user_id: int,
        comment: str | None = None,
    ) -> tuple[Ticket, None] | tuple[None, str]:
        """Return (ticket, None) on success, or (None, error_message) on failure."""
        ticket = await self.get_ticket(ticket_id)
        if ticket is None:
            return None, "not_found"

        allowed = _ALLOWED_TRANSITIONS.get(ticket.status, set())
        if new_status not in allowed:
            return None, f"transition_invalid:{ticket.status}>{new_status}"

        old_status = ticket.status
        ticket.status = new_status

        now = datetime.now(UTC)
        await SlaService(self._db).on_status_changed(ticket, old_status, new_status, now)

        event = TicketEvent(
            ticket_id=ticket_id,
            event_type="status_changed",
            payload={
                "from": old_status,
                "to": new_status,
                "changed_by_user_id": changed_by_user_id,
                **({"comment": comment} if comment else {}),
            },
        )
        self._db.add(event)
        await self._db.commit()

        result = await self._db.execute(
            select(Ticket)
            .where(Ticket.id == ticket_id)
            .options(
                selectinload(Ticket.source),
                selectinload(Ticket.events),
                selectinload(Ticket.assignee),
                selectinload(Ticket.tags),
            )
        )
        return result.scalar_one_or_none(), None

    async def bulk_update(
        self,
        ticket_ids: list[int],
        *,
        status: str | None = None,
        priority: str | None = None,
        assigned_to_user_id: int | None = None,
        changed_by_user_name: str,
        comment: str | None = None,
    ) -> list[Ticket]:
        """Update multiple tickets at once. Returns the list of updated tickets."""
        # Note: In a large production system, we'd use a single UPDATE ... WHERE id IN (...)
        # for performance. But Aegis needs to trigger SLA logic, events, and webhooks
        # per ticket. We iterate for now, which is safe for typical bulk sizes (20-50).
        updated_tickets = []
        for tid in ticket_ids:
            ticket = await self.get_ticket(tid)
            if not ticket:
                continue

            changed = False
            if status and ticket.status != status:
                # We skip transition validation for bulk updates to allow "cleanup" actions
                old_status = ticket.status
                ticket.status = status
                self._db.add(
                    TicketEvent(
                        ticket_id=ticket.id,
                        event_type="status_changed",
                        payload={
                            "old_status": old_status,
                            "new_status": status,
                            "changed_by": changed_by_user_name,
                            **({"comment": comment} if comment else {}),
                        },
                    )
                )
                await SlaService(self._db).on_status_changed(
                    ticket, old_status, status, datetime.now(UTC)
                )
                changed = True

            if priority and ticket.priority != priority:
                old_priority = ticket.priority
                ticket.priority = priority
                self._db.add(
                    TicketEvent(
                        ticket_id=ticket.id,
                        event_type="priority_changed",
                        payload={
                            "old_priority": old_priority,
                            "new_priority": priority,
                            "changed_by": changed_by_user_name,
                        },
                    )
                )
                changed = True

            if assigned_to_user_id is not None:
                # We use -1 or similar if we wanted to unassign, but schema says int | None
                # If the user passed a specific ID or None, we apply it
                if ticket.assigned_to_user_id != assigned_to_user_id:
                    ticket.assigned_to_user_id = assigned_to_user_id
                    self._db.add(
                        TicketEvent(
                            ticket_id=ticket.id,
                            event_type="assigned",
                            payload={
                                "assigned_to_user_id": assigned_to_user_id,
                                "changed_by": changed_by_user_name,
                            },
                        )
                    )
                    changed = True

            if changed:
                self._db.add(ticket)
                updated_tickets.append(ticket)

        if updated_tickets:
            await self._db.commit()
            # Refresh to load relationships (source, assignee) for the response
            for t in updated_tickets:
                await self._db.refresh(t, ["source", "assignee"])

        return updated_tickets

    async def create_internal_ticket(
        self,
        subject: str,
        description: str,
        type: str,
        priority: str,
        user_id: int,
        meta: dict | None = None,
    ) -> Ticket:
        # Find the Aegis Internal source
        source_result = await self._db.execute(select(Source).where(Source.slug == "aegis"))
        source = source_result.scalar_one()

        # Generate external_id: AEGIS-<timestamp>
        now = datetime.now(UTC)
        external_id = f"AEGIS-{int(now.timestamp())}"

        ticket = Ticket(
            source_id=source.id,
            external_id=external_id,
            type=type,
            priority=priority,
            status="open",
            subject=subject,
            description=description,
            source_metadata={
                **(meta or {}),
                "reported_by_user_id": user_id,
            },
            source_created_at=now,
            source_updated_at=now,
        )
        self._db.add(ticket)
        await self._db.flush()

        # Create initial event
        event = TicketEvent(
            ticket_id=ticket.id,
            event_type="created",
            payload={
                "created_by_user_id": user_id,
                "via": "internal_portal",
            },
            occurred_at=now,
        )
        self._db.add(event)

        await self._db.commit()

        # Return the ticket with relationships loaded
        result = await self._db.execute(
            select(Ticket)
            .where(Ticket.id == ticket.id)
            .options(
                selectinload(Ticket.source),
                selectinload(Ticket.events),
                selectinload(Ticket.assignee),
                selectinload(Ticket.tags),
            )
        )
        return result.scalar_one()

    async def update_tags(self, ticket_id: int, tag_ids: list[int], changed_by: str) -> Ticket | None:
        ticket = await self.get_ticket(ticket_id)
        if not ticket:
            return None

        # Fetch tags
        result = await self._db.execute(select(Tag).where(Tag.id.in_(tag_ids)))
        new_tags = list(result.scalars().all())

        old_tag_names = [t.name for t in ticket.tags]
        new_tag_names = [t.name for t in new_tags]

        if set(old_tag_names) != set(new_tag_names):
            ticket.tags = new_tags
            self._db.add(
                TicketEvent(
                    ticket_id=ticket.id,
                    event_type="tags_updated",
                    payload={
                        "old_tags": old_tag_names,
                        "new_tags": new_tag_names,
                        "changed_by": changed_by,
                    },
                )
            )
            await self._db.commit()
            await self._db.refresh(ticket, ["tags", "source", "assignee"])
        
        return ticket
