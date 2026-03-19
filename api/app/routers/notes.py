from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.auth import CurrentUser
from app.core.dependencies import DbSession
from app.models.ticket import Ticket
from app.models.ticket_note import TicketNote
from app.models.user import User  # noqa: F401 — loaded via selectinload
from app.schemas.note import CreateNoteRequest, NoteAuthorResponse, NoteResponse

router = APIRouter(prefix="/v1/tickets", tags=["notes"])


@router.get("/{ticket_id}/notes", response_model=list[NoteResponse])
async def list_notes(ticket_id: int, db: DbSession, _current_user: CurrentUser) -> list[NoteResponse]:
    ticket_exists = await db.scalar(select(Ticket.id).where(Ticket.id == ticket_id))
    if ticket_exists is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    result = await db.execute(
        select(TicketNote)
        .where(TicketNote.ticket_id == ticket_id)
        .options(selectinload(TicketNote.author))
        .order_by(TicketNote.created_at)
    )
    notes = list(result.scalars().all())
    return [
        NoteResponse(
            id=n.id,
            ticket_id=n.ticket_id,
            body=n.body,
            author=NoteAuthorResponse(id=n.author.id, name=n.author.name) if n.author else None,
            created_at=n.created_at,
        )
        for n in notes
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

    note = TicketNote(ticket_id=ticket_id, author_id=current_user.id, body=body.body)
    db.add(note)
    await db.commit()
    await db.refresh(note)

    result = await db.execute(
        select(TicketNote)
        .where(TicketNote.id == note.id)
        .options(selectinload(TicketNote.author))
    )
    note = result.scalar_one()
    return NoteResponse(
        id=note.id,
        ticket_id=note.ticket_id,
        body=note.body,
        author=NoteAuthorResponse(id=note.author.id, name=note.author.name) if note.author else None,
        created_at=note.created_at,
    )
