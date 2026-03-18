from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.source import Source  # noqa: F401 — loaded via selectinload
from app.models.ticket import Ticket
from app.models.ticket_event import TicketEvent  # noqa: F401 — loaded via selectinload


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
        if created_after is not None:
            query = query.where(Ticket.first_ingested_at >= created_after)
        if created_before is not None:
            query = query.where(Ticket.first_ingested_at <= created_before)

        count_result = await self._db.execute(select(func.count()).select_from(query.subquery()))
        total = count_result.scalar_one()

        result = await self._db.execute(
            query.options(selectinload(Ticket.source))
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
            .options(selectinload(Ticket.source), selectinload(Ticket.events))
        )
        return result.scalar_one_or_none()
