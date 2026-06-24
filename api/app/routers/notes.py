from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.auth import CurrentUser
from app.core.dependencies import DbSession
from app.models.ticket import Ticket
from app.models.ticket_message import TicketMessage
from app.schemas.note import CreateNoteRequest, NoteAuthorResponse, NoteResponse

router = APIRouter(prefix="/v1/tickets", tags=["notes"])


@router.get("/{ticket_id}/notes", response_model=list[NoteResponse])
async def list_notes(
    ticket_id: int, db: DbSession, _current_user: CurrentUser
) -> list[NoteResponse]:
    ticket_exists = await db.scalar(select(Ticket.id).where(Ticket.id == ticket_id))
    if ticket_exists is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    result = await db.execute(
        select(TicketMessage)
        .where(TicketMessage.ticket_id == ticket_id, TicketMessage.is_internal == True)  # noqa: E712
        .order_by(TicketMessage.created_at)
    )
    messages = list(result.scalars().all())
    return [
        NoteResponse(
            id=m.id,
            ticket_id=m.ticket_id,
            body=m.body,
            author=NoteAuthorResponse(id=m.author_user_id, name=m.author_name)
            if m.author_user_id
            else None,
            created_at=m.created_at,
        )
        for m in messages
    ]


@router.post("/{ticket_id}/notes", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    ticket_id: int,
    body: CreateNoteRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> NoteResponse:
    ticket_exists = await db.scalar(select(Ticket.id).where(Ticket.id == ticket_id))
    if ticket_exists is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    message = TicketMessage(
        ticket_id=ticket_id,
        direction="outbound",
        author_name=current_user.name,
        author_user_id=current_user.id,
        body=body.body,
        is_internal=True,
        mentioned_user_ids=[],
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)

    return NoteResponse(
        id=message.id,
        ticket_id=message.ticket_id,
        body=message.body,
        author=NoteAuthorResponse(id=message.author_user_id, name=message.author_name),
        created_at=message.created_at,
    )
