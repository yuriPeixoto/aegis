from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class NoteAuthorResponse(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class NoteResponse(BaseModel):
    id: int
    ticket_id: int
    body: str
    author: NoteAuthorResponse | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class CreateNoteRequest(BaseModel):
    body: str
