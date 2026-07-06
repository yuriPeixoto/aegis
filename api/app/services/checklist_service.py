from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ticket_checklist_item import TicketChecklistItem


class ChecklistService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def list_for_ticket(self, ticket_id: int) -> list[TicketChecklistItem]:
        result = await self._db.execute(
            select(TicketChecklistItem)
            .where(TicketChecklistItem.ticket_id == ticket_id)
            .order_by(TicketChecklistItem.position)
        )
        return list(result.scalars().all())

    async def create_item(
        self, ticket_id: int, text: str, created_by: int | None = None
    ) -> TicketChecklistItem:
        next_position = await self._db.scalar(
            select(func.coalesce(func.max(TicketChecklistItem.position), -1) + 1).where(
                TicketChecklistItem.ticket_id == ticket_id
            )
        )
        item = TicketChecklistItem(
            ticket_id=ticket_id,
            text=text,
            position=next_position,
            created_by=created_by,
        )
        self._db.add(item)
        await self._db.commit()
        await self._db.refresh(item)
        return item

    async def create_items_bulk(
        self, ticket_id: int, texts: list[str], created_by: int | None = None
    ) -> list[TicketChecklistItem]:
        """Used by ingest — creates several items at once, preserving order."""
        items = [
            TicketChecklistItem(
                ticket_id=ticket_id, text=text, position=position, created_by=created_by
            )
            for position, text in enumerate(texts)
            if text.strip()
        ]
        self._db.add_all(items)
        await self._db.flush()
        return items

    async def update_item(
        self,
        ticket_id: int,
        item_id: int,
        *,
        text: str | None = None,
        is_done: bool | None = None,
        done_by: int | None = None,
    ) -> TicketChecklistItem | None:
        item = await self._db.scalar(
            select(TicketChecklistItem).where(
                TicketChecklistItem.id == item_id, TicketChecklistItem.ticket_id == ticket_id
            )
        )
        if item is None:
            return None

        if text is not None:
            item.text = text

        if is_done is not None and is_done != item.is_done:
            item.is_done = is_done
            if is_done:
                item.done_by = done_by
                item.done_at = datetime.now(UTC)
            else:
                item.done_by = None
                item.done_at = None

        await self._db.commit()
        await self._db.refresh(item)
        return item

    async def delete_item(self, ticket_id: int, item_id: int) -> bool:
        item = await self._db.scalar(
            select(TicketChecklistItem).where(
                TicketChecklistItem.id == item_id, TicketChecklistItem.ticket_id == ticket_id
            )
        )
        if item is None:
            return False
        await self._db.delete(item)
        await self._db.commit()
        return True

    @staticmethod
    def progress(items: list[TicketChecklistItem]) -> dict[str, int]:
        return {"done": sum(1 for i in items if i.is_done), "total": len(items)}
