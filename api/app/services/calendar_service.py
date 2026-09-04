from __future__ import annotations

from datetime import date

from sqlalchemy import and_, extract, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.calendar_event import CalendarEvent
from app.models.ticket import Ticket
from app.schemas.calendar_event import CalendarEventCreate, CalendarEventUpdate

_TICKET_TAGS_OPTION = selectinload(CalendarEvent.ticket).selectinload(Ticket.tags)


class CalendarService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def list_events(
        self,
        *,
        viewer_id: int,
        year: int | None = None,
        month: int | None = None,
        event_type: str | None = None,
        agent_id: int | None = None,
        from_date: date | None = None,
    ) -> list[CalendarEvent]:
        stmt = select(CalendarEvent).options(_TICKET_TAGS_OPTION)
        # Tarefa é sempre individual — só o próprio dono vê a sua (mesmo admin,
        # que se quiser visão de time usa os dashboards, não a Agenda).
        # Plantão/treinamento continuam compartilhados: a equipe precisa saber
        # quem está de plantão ou indisponível por treinamento.
        stmt = stmt.where(or_(CalendarEvent.type != "task", CalendarEvent.agent_id == viewer_id))
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
        # populate_existing força reload mesmo se o objeto já estiver expirado
        # no identity map (ex.: logo após um commit em create()/update()) —
        # sem isso, db.get() pode devolver o objeto antigo sem os eager loads.
        return await self._db.get(
            CalendarEvent, event_id, options=[_TICKET_TAGS_OPTION], populate_existing=True
        )

    async def create(self, data: CalendarEventCreate) -> CalendarEvent:
        event = CalendarEvent(**data.model_dump())
        self._db.add(event)
        await self._db.commit()
        # refresh() não recarrega relacionamentos aninhados (ticket.tags) —
        # busca de novo via get(), que já traz o eager load certo.
        created = await self.get(event.id)
        assert created is not None
        return created

    async def update(self, event_id: int, data: CalendarEventUpdate) -> CalendarEvent | None:
        event = await self.get(event_id)
        if event is None:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(event, field, value)
        await self._db.commit()
        updated = await self.get(event_id)
        assert updated is not None
        return updated

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
