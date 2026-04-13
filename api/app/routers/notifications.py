from __future__ import annotations

from datetime import date, datetime

from fastapi import APIRouter, status
from pydantic import BaseModel

from app.core.auth import CurrentUser
from app.core.dependencies import DbSession
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/v1/me/notifications", tags=["notifications"])


class NotificationResponse(BaseModel):
    id: int
    type: str
    # ticket fields (null for calendar notifications)
    ticket_id: int | None
    ticket_external_id: str | None
    ticket_subject: str | None
    actor_name: str
    # calendar fields (null for ticket notifications)
    calendar_event_id: int | None = None
    event_date: date | None = None
    read_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class UnreadCountResponse(BaseModel):
    count: int


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    db: DbSession, current_user: CurrentUser
) -> list[NotificationResponse]:
    notifications = await NotificationService(db).list_for_user(current_user.id)
    return [NotificationResponse.model_validate(n) for n in notifications]


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


@router.post("/read-ticket/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
async def mark_ticket_read(
    ticket_id: int, db: DbSession, current_user: CurrentUser
) -> None:
    """Called automatically when the user opens a ticket — clears mention notifications for it."""
    await NotificationService(db).mark_ticket_notifications_read(current_user.id, ticket_id)
