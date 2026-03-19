from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.source import Source  # noqa: F401 — loaded via selectinload
from app.models.ticket import Ticket
from app.models.ticket_event import TicketEvent  # noqa: F401 — loaded via selectinload
from app.models.user import User  # noqa: F401 — loaded via selectinload


class TicketService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def list_tickets(
        self,
        *,
        source_id: int | None = None,
        status: str | None = None,
        priority: str | None = None,
        type: str | None = None,
        assigned_to_user_id: int | None = None,
        unassigned: bool = False,
        created_after: datetime | None = None,
        created_before: datetime | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Ticket], int]:
        query = select(Ticket)

        if source_id is not None:
            query = query.where(Ticket.source_id == source_id)
        if status is not None:
            query = query.where(Ticket.status == status)
        if priority is not None:
            query = query.where(Ticket.priority == priority)
        if type is not None:
            query = query.where(Ticket.type == type)
        if unassigned:
            query = query.where(Ticket.assigned_to_user_id.is_(None))
        elif assigned_to_user_id is not None:
            query = query.where(Ticket.assigned_to_user_id == assigned_to_user_id)
        if created_after is not None:
            query = query.where(Ticket.first_ingested_at >= created_after)
        if created_before is not None:
            query = query.where(Ticket.first_ingested_at <= created_before)

        count_result = await self._db.execute(select(func.count()).select_from(query.subquery()))
        total = count_result.scalar_one()

        result = await self._db.execute(
            query.options(selectinload(Ticket.source), selectinload(Ticket.assignee))
            .order_by(Ticket.first_ingested_at.desc())
            .limit(limit)
            .offset(offset)
        )
        tickets = list(result.scalars().all())
        return tickets, total

    async def get_ticket(self, ticket_id: int) -> Ticket | None:
        result = await self._db.execute(
            select(Ticket)
            .where(Ticket.id == ticket_id)
            .options(
                selectinload(Ticket.source),
                selectinload(Ticket.events),
                selectinload(Ticket.assignee),
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
            )
        )
        return result.scalar_one_or_none()
