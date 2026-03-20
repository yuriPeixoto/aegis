from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ticket import Ticket
from app.models.ticket_message import TicketMessage


class MessageService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def list_messages(self, ticket_id: int) -> list[TicketMessage]:
        result = await self._db.execute(
            select(TicketMessage)
            .where(TicketMessage.ticket_id == ticket_id)
            .order_by(TicketMessage.created_at.asc())
        )
        return list(result.scalars().all())

    async def create_outbound(
        self, ticket: Ticket, body: str, agent_name: str
    ) -> TicketMessage:
        message = TicketMessage(
            ticket_id=ticket.id,
            direction="outbound",
            author_name=agent_name,
            body=body,
        )
        self._db.add(message)
        await self._db.commit()
        await self._db.refresh(message)
        return message

    async def create_inbound(
        self,
        ticket: Ticket,
        body: str,
        author_name: str,
        source_message_id: str | None = None,
    ) -> TicketMessage | None:
        """Create an inbound message. Returns None if source_message_id already exists (dedup)."""
        if source_message_id:
            result = await self._db.execute(
                select(TicketMessage).where(
                    TicketMessage.ticket_id == ticket.id,
                    TicketMessage.source_message_id == source_message_id,
                )
            )
            if result.scalar_one_or_none() is not None:
                return None  # duplicate

        message = TicketMessage(
            ticket_id=ticket.id,
            direction="inbound",
            author_name=author_name,
            body=body,
            source_message_id=source_message_id,
        )
        self._db.add(message)
        await self._db.commit()
        await self._db.refresh(message)
        return message
