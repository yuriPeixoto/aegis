from __future__ import annotations

import base64
import json
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Form, HTTPException, UploadFile, status
from fastapi import File as FastAPIFile
from pydantic import BaseModel

from app.core.auth import CurrentUser
from app.core.dependencies import DbSession
from app.models.ticket_message import TicketMessage
from app.services.attachment_service import AttachmentService
from app.services.message_service import MessageService
from app.services.notification_service import NotificationService
from app.services.ticket_service import TicketService
from app.services.webhook_service import dispatch_webhook

router = APIRouter(prefix="/v1/tickets", tags=["messages"])


class AttachmentInfo(BaseModel):
    id: int
    filename: str
    content_type: str
    size_bytes: int
    download_url: str


class MessageAuthor(BaseModel):
    id: int
    name: str


class MessageResponse(BaseModel):
    id: int
    direction: str
    author_name: str
    author_user_id: int | None
    body: str
    is_internal: bool
    mentioned_user_ids: list[int]
    created_at: datetime
    attachments: list[AttachmentInfo] = []

    model_config = {"from_attributes": True}


def _to_response(m: TicketMessage) -> MessageResponse:
    return MessageResponse(
        id=m.id,
        direction=m.direction,
        author_name=m.author_name,
        author_user_id=m.author_user_id,
        body=m.body,
        is_internal=m.is_internal,
        mentioned_user_ids=m.mentioned_user_ids or [],
        created_at=m.created_at,
        attachments=[
            AttachmentInfo(
                id=a.id,
                filename=a.original_filename,
                content_type=a.content_type,
                size_bytes=a.size_bytes,
                download_url=f"/attachments/{a.id}/download",
            )
            for a in (m.attachments or [])
        ],
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
    db: DbSession,
    current_user: CurrentUser,
    background_tasks: BackgroundTasks,
    body: str = Form(...),
    is_internal: bool = Form(False),
    mentioned_user_ids: str = Form("[]"),
    file: UploadFile | None = FastAPIFile(None),
) -> MessageResponse:
    ticket = await TicketService(db).get_ticket(ticket_id)
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    try:
        parsed_mentions: list[int] = json.loads(mentioned_user_ids)
    except (json.JSONDecodeError, ValueError):
        parsed_mentions = []

    message = await MessageService(db).create_outbound(
        ticket,
        body,
        current_user.name,
        is_internal=is_internal,
        author_user_id=current_user.id,
        mentioned_user_ids=parsed_mentions,
    )

    # Handle optional attachment
    webhook_attachments: list[dict] = []
    if file and file.filename:
        try:
            att_service = AttachmentService(db)
            attachment = await att_service.upload(ticket_id, file, current_user.id)

            # Link to message
            attachment.message_id = message.id
            await db.commit()
            await db.refresh(attachment)

            # Read bytes for webhook payload
            file_path = att_service.resolve_path(attachment)
            content = Path(file_path).read_bytes()
            webhook_attachments = [{
                "filename": attachment.original_filename,
                "content_type": attachment.content_type,
                "size_bytes": attachment.size_bytes,
                "data": base64.b64encode(content).decode(),
            }]
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

    # Create mention notifications for internal notes
    if is_internal and parsed_mentions:
        await NotificationService(db).create_mention_notifications(
            message=message,
            ticket=ticket,
            actor_name=current_user.name,
            mentioned_user_ids=parsed_mentions,
        )

    # Internal notes are never pushed to source systems
    if not is_internal and ticket.source and ticket.source.webhook_url:
        webhook_payload: dict = {
            "external_id": ticket.external_id,
            "body": body,
            "agent_name": current_user.name,
            "attachments": webhook_attachments,
        }
        background_tasks.add_task(
            dispatch_webhook,
            webhook_url=ticket.source.webhook_url,
            webhook_secret=ticket.source.webhook_secret,
            event_type="agent_reply",
            payload=webhook_payload,
        )

    # Reload message with attachment relationship populated
    message = await MessageService(db).get_with_attachments(message.id)
    return _to_response(message)
