from __future__ import annotations

from datetime import UTC, datetime

from pydantic import BaseModel, computed_field

_TERMINAL_STATUSES = {"resolved", "closed", "cancelled"}


class TicketEventResponse(BaseModel):
    id: int
    event_type: str
    payload: dict | None
    occurred_at: datetime

    model_config = {"from_attributes": True}


class AssigneeResponse(BaseModel):
    id: int
    name: str

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
    sla_due_at: datetime | None = None
    assigned_to: AssigneeResponse | None = None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def sla_status(self) -> str | None:
        if self.sla_due_at is None:
            return None
        if self.status in _TERMINAL_STATUSES:
            return "met"
        now = datetime.now(UTC)
        if now >= self.sla_due_at:
            return "overdue"
        total = (self.sla_due_at - self.first_ingested_at).total_seconds()
        remaining = (self.sla_due_at - now).total_seconds()
        if total > 0 and remaining / total < 0.2:
            return "at_risk"
        return "on_time"

    model_config = {"from_attributes": True}


class AssignTicketRequest(BaseModel):
    user_id: int | None


class UpdateStatusRequest(BaseModel):
    status: str
    comment: str | None = None


class TicketDetailResponse(TicketResponse):
    events: list[TicketEventResponse]


class TicketListResponse(BaseModel):
    items: list[TicketResponse]
    total: int
    limit: int
    offset: int
