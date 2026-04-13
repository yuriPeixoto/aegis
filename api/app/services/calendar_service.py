from __future__ import annotations

from datetime import date

from sqlalchemy import and_, extract, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.calendar_event import CalendarEvent
from app.schemas.calendar_event import CalendarEventCreate, CalendarEventUpdate


class CalendarService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def list_events(
        self,
        *,
        year: int | None = None,
        month: int | None = None,
        event_type: str | None = None,
        agent_id: int | None = None,
        from_date: date | None = None,
    ) -> list[CalendarEvent]:
        stmt = select(CalendarEvent)
        if year is not None:
            stmt = stmt.where(extract("year", CalendarEvent.event_date) == year)
        if month is not None:
            stmt = stmt.where(extract("month", CalendarEvent.event_date) == month)
        if event_type is not None:
            stmt = stmt.where(CalendarEvent.type == event_type)
        if agent_id is not None:
            stmt = stmt.where(CalendarEvent.agent_id == agent_id)
        if from_date is not None:
            stmt = stmt.where(CalendarEvent.event_date >= from_date)
        stmt = stmt.order_by(CalendarEvent.event_date, CalendarEvent.start_time)
        result = await self._db.execute(stmt)
        return list(result.scalars().all())

    async def get(self, event_id: int) -> CalendarEvent | None:
        return await self._db.get(CalendarEvent, event_id)

    async def create(self, data: CalendarEventCreate) -> CalendarEvent:
        event = CalendarEvent(**data.model_dump())
        self._db.add(event)
        await self._db.commit()
        await self._db.refresh(event)
        return event

    async def update(self, event_id: int, data: CalendarEventUpdate) -> CalendarEvent | None:
        event = await self.get(event_id)
        if event is None:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(event, field, value)
        await self._db.commit()
        await self._db.refresh(event)
        return event

    async def delete(self, event_id: int) -> bool:
        event = await self.get(event_id)
        if event is None:
            return False
        await self._db.delete(event)
        await self._db.commit()
        return True

    async def on_call_conflict(self, event_date: date, exclude_id: int | None = None) -> bool:
        """Retorna True se já existe um on_call nessa data."""
        stmt = select(CalendarEvent).where(
            and_(CalendarEvent.type == "on_call", CalendarEvent.event_date == event_date)
        )
        if exclude_id is not None:
            stmt = stmt.where(CalendarEvent.id != exclude_id)
        result = await self._db.execute(stmt)
        return result.scalar_one_or_none() is not None
