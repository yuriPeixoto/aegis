from __future__ import annotations

from datetime import date, datetime

from fastapi import APIRouter, Query, status
from pydantic import BaseModel

from app.core.auth import CurrentUser
from app.core.dependencies import DbSession
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/v1/me/notifications", tags=["notifications"])


class NotificationResponse(BaseModel):
    id: int
    type: str
    ticket_id: int | None
    ticket_external_id: str | None
    ticket_subject: str | None
    actor_name: str
    calendar_event_id: int | None = None
    event_date: date | None = None
    read_at: datetime | None
    created_at: datetime
    source_id: int | None = None
    source_name: str | None = None

    model_config = {"from_attributes": True}


class UnreadCountResponse(BaseModel):
    count: int


class MarkSelectedRequest(BaseModel):
    ids: list[int]


def _to_response(n: object) -> NotificationResponse:  # type: ignore[type-arg]
    source_id: int | None = None
    source_name: str | None = None
    ticket = getattr(n, "ticket", None)
    if ticket is not None:
        source_id = getattr(ticket, "source_id", None)
        source = getattr(ticket, "source", None)
        if source is not None:
            source_name = getattr(source, "name", None)
    return NotificationResponse(
        id=n.id,  # type: ignore[attr-defined]
        type=n.type,  # type: ignore[attr-defined]
        ticket_id=n.ticket_id,  # type: ignore[attr-defined]
        ticket_external_id=n.ticket_external_id,  # type: ignore[attr-defined]
        ticket_subject=n.ticket_subject,  # type: ignore[attr-defined]
        actor_name=n.actor_name,  # type: ignore[attr-defined]
        calendar_event_id=n.calendar_event_id,  # type: ignore[attr-defined]
        event_date=n.event_date,  # type: ignore[attr-defined]
        read_at=n.read_at,  # type: ignore[attr-defined]
        created_at=n.created_at,  # type: ignore[attr-defined]
        source_id=source_id,
        source_name=source_name,
    )


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    db: DbSession,
    current_user: CurrentUser,
    unread_only: bool = Query(False),
    limit: int = Query(20, ge=1, le=500),
) -> list[NotificationResponse]:
    notifications = await NotificationService(db).list_for_user(
        current_user.id,
        unread_only=unread_only,
        limit=limit,
    )
    return [_to_response(n) for n in notifications]


@router.get("/unread-count", response_model=UnreadCountResponse)
async def unread_count(db: DbSession, current_user: CurrentUser) -> UnreadCountResponse:
    count = await NotificationService(db).unread_count(current_user.id)
    return UnreadCountResponse(count=count)


@router.patch("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(
    notification_id: int, db: DbSession, current_user: CurrentUser
) -> None:
    await NotificationService(db).mark_read(notification_id, current_user.id)


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_read(db: DbSession, current_user: CurrentUser) -> None:
    await NotificationService(db).mark_all_read(current_user.id)


@router.post("/read-selected", status_code=status.HTTP_204_NO_CONTENT)
async def mark_selected_read(
    body: MarkSelectedRequest, db: DbSession, current_user: CurrentUser
) -> None:
    await NotificationService(db).mark_selected_read(current_user.id, body.ids)


@router.post("/read-ticket/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
async def mark_ticket_read(
    ticket_id: int, db: DbSession, current_user: CurrentUser
) -> None:
    await NotificationService(db).mark_ticket_notifications_read(current_user.id, ticket_id)
