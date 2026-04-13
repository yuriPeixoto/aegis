from __future__ import annotations

from datetime import date

from fastapi import APIRouter, HTTPException, Query, status

from pydantic import BaseModel

from app.core.auth import AdminUser, CurrentUser
from app.core.dependencies import DbSession
from app.models.user import ROLE_ADMIN
from app.schemas.calendar_event import CalendarEventCreate, CalendarEventResponse, CalendarEventUpdate
from app.services.calendar_service import CalendarService
from app.services.calendar_reminder_service import CalendarReminderService

router = APIRouter(prefix="/v1/calendar", tags=["calendar"])


@router.get("/events", response_model=list[CalendarEventResponse])
async def list_events(
    db: DbSession,
    _: CurrentUser,
    year: int | None = Query(default=None),
    month: int | None = Query(default=None, ge=1, le=12),
    type: str | None = Query(default=None),
    agent_id: int | None = Query(default=None),
    from_date: date | None = Query(default=None),
) -> list[CalendarEventResponse]:
    events = await CalendarService(db).list_events(
        year=year,
        month=month,
        event_type=type,
        agent_id=agent_id,
        from_date=from_date,
    )
    return [CalendarEventResponse.model_validate(e) for e in events]


@router.post("/events", response_model=CalendarEventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    data: CalendarEventCreate,
    db: DbSession,
    current_user: CurrentUser,
) -> CalendarEventResponse:
    # on_call: somente admin
    if data.type == "on_call" and current_user.role != ROLE_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can create on-call events")

    svc = CalendarService(db)

    if data.type == "on_call":
        if await svc.on_call_conflict(data.event_date):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An on-call event already exists for this date",
            )

    event = await svc.create(data)
    return CalendarEventResponse.model_validate(event)


@router.patch("/events/{event_id}", response_model=CalendarEventResponse)
async def update_event(
    event_id: int,
    data: CalendarEventUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> CalendarEventResponse:
    svc = CalendarService(db)
    event = await svc.get(event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    # on_call: somente admin pode editar
    if event.type == "on_call" and current_user.role != ROLE_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can edit on-call events")

    # training: agent só edita o próprio
    if event.type == "training" and current_user.role != ROLE_ADMIN and event.agent_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only edit your own training events")

    # Verifica conflito de on_call se a data mudar
    new_date = data.event_date or event.event_date
    if event.type == "on_call" and new_date != event.event_date:
        if await svc.on_call_conflict(new_date, exclude_id=event_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An on-call event already exists for this date",
            )

    updated = await svc.update(event_id, data)
    return CalendarEventResponse.model_validate(updated)


class ReminderRunResult(BaseModel):
    target_date: str
    events_found: int
    reminders_created: int
    skipped_duplicate: int


@router.post("/reminders/run", response_model=ReminderRunResult)
async def run_reminders(db: DbSession, _: AdminUser) -> ReminderRunResult:
    """Cria lembretes para eventos do dia seguinte. Chamado pelo cron do OS ou manualmente."""
    result = await CalendarReminderService(db).run()
    return ReminderRunResult(**result)


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> None:
    svc = CalendarService(db)
    event = await svc.get(event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    if event.type == "on_call" and current_user.role != ROLE_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can delete on-call events")

    if event.type == "training" and current_user.role != ROLE_ADMIN and event.agent_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete your own training events")

    await svc.delete(event_id)
