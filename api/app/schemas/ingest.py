from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class TicketIngestPayload(BaseModel):
    """Payload sent by an external system when a ticket is created or updated."""

    external_id: str = Field(..., min_length=1, max_length=100)
    type: str | None = Field(None, max_length=50)
    priority: str | None = Field(None, max_length=50)
    status: str = Field(..., max_length=100)
    subject: str = Field(..., min_length=1, max_length=500)
    description: str | None = None
    source_metadata: dict | None = None
    source_created_at: datetime | None = None
    source_updated_at: datetime | None = None


class TicketEventPayload(BaseModel):
    """Payload sent when a ticket state changes in the source system."""

    external_id: str = Field(..., min_length=1, max_length=100)
    event_type: str = Field(..., max_length=100)
    payload: dict | None = None
    occurred_at: datetime | None = None


class IngestResponse(BaseModel):
    ticket_id: int
    external_id: str
    created: bool  # True = new ticket, False = updated existing
