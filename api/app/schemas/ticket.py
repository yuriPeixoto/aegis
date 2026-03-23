from __future__ import annotations

from datetime import UTC, datetime

from pydantic import BaseModel, computed_field

_TERMINAL_STATUSES = {"pending_closure", "resolved", "closed", "cancelled"}
_PAUSED_STATUSES = {"waiting_client"}


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
    sla_started_at: datetime | None = None
    sla_paused_seconds: int = 0
    sla_paused_since: datetime | None = None
    last_inbound_at: datetime | None = None
    assigned_to: AssigneeResponse | None = None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def sla_status(self) -> str | None:
        if self.sla_due_at is None:
            return None
        if self.status in _TERMINAL_STATUSES:
            return "met"
        if self.status in _PAUSED_STATUSES and self.sla_paused_since is not None:
            return "paused"
        now = datetime.now(UTC)
        if now >= self.sla_due_at:
            return "overdue"
        # Use sla_started_at for the total span if available, else fall back to ingestion
        reference = self.sla_started_at or self.first_ingested_at
        total = (self.sla_due_at - reference).total_seconds()
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


class OverrideSlaRequest(BaseModel):
    due_at: datetime
    reason: str | None = None


class TicketDetailResponse(TicketResponse):
    events: list[TicketEventResponse]


class TicketListResponse(BaseModel):
    items: list[TicketResponse]
    total: int
    limit: int
    offset: int
