from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class TicketEventResponse(BaseModel):
    id: int
    event_type: str
    payload: dict | None
    occurred_at: datetime

    model_config = {"from_attributes": True}


class TicketResponse(BaseModel):
    id: int
    source_id: int
    source_name: str
    external_id: str
    type: str | None
    priority: str | None
    status: str
    subject: str
    description: str | None
    source_metadata: dict | None
    source_created_at: datetime | None
    source_updated_at: datetime | None
    first_ingested_at: datetime
    last_synced_at: datetime

    model_config = {"from_attributes": True}


class TicketDetailResponse(TicketResponse):
    events: list[TicketEventResponse]


class TicketListResponse(BaseModel):
    items: list[TicketResponse]
    total: int
    limit: int
    offset: int
