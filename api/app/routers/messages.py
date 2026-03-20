from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from pydantic import BaseModel

from app.core.auth import CurrentUser
from app.core.dependencies import DbSession
from app.models.ticket_message import TicketMessage
from app.services.message_service import MessageService
from app.services.ticket_service import TicketService
from app.services.webhook_service import dispatch_webhook

router = APIRouter(prefix="/v1/tickets", tags=["messages"])


class MessageResponse(BaseModel):
    id: int
    direction: str
    author_name: str
    body: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SendMessageRequest(BaseModel):
    body: str


def _to_response(m: TicketMessage) -> MessageResponse:
    return MessageResponse(
        id=m.id,
        direction=m.direction,
        author_name=m.author_name,
        body=m.body,
        created_at=m.created_at,
    )


@router.get("/{ticket_id}/messages", response_model=list[MessageResponse])
async def list_messages(ticket_id: int, db: DbSession, _user: CurrentUser) -> list[MessageResponse]:
    messages = await MessageService(db).list_messages(ticket_id)
    return [_to_response(m) for m in messages]


@router.post(
    "/{ticket_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def send_message(
    ticket_id: int,
    body: SendMessageRequest,
    db: DbSession,
    current_user: CurrentUser,
    background_tasks: BackgroundTasks,
) -> MessageResponse:
    ticket = await TicketService(db).get_ticket(ticket_id)
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    message = await MessageService(db).create_outbound(ticket, body.body, current_user.name)

    if ticket.source and ticket.source.webhook_url:
        background_tasks.add_task(
            dispatch_webhook,
            webhook_url=ticket.source.webhook_url,
            webhook_secret=ticket.source.webhook_secret,
            event_type="agent_reply",
            payload={
                "external_id": ticket.external_id,
                "body": body.body,
                "agent_name": current_user.name,
            },
        )

    return _to_response(message)
