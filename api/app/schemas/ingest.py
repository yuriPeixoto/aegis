from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, Field


class IngestAttachment(BaseModel):
    filename: str
    content_type: str
    size_bytes: int
    data: str  # base64-encoded content


class TicketIngestPayload(BaseModel):
    """Payload sent by an external system when a ticket is created or updated."""

    external_id: str = Field(..., min_length=1, max_length=100)
    type: str | None = Field(None, max_length=50)
    priority: str | None = Field(None, max_length=50)
    status: str = Field(..., max_length=100)
    subject: str = Field(..., min_length=1, max_length=500)
    description: str | None = None
    source_metadata: dict[str, Any] | None = None
    source_created_at: datetime | None = None
    source_updated_at: datetime | None = None
    assigned_to_user_id: int | None = None
    attachments: list[IngestAttachment] = Field(default_factory=list)
    checklist_items: list[str] = Field(default_factory=list)


class TicketEventPayload(BaseModel):
    """Payload sent when a ticket state changes in the source system."""

    external_id: str = Field(..., min_length=1, max_length=100)
    event_type: str = Field(..., max_length=100)
    payload: dict[str, Any] | None = None
    occurred_at: datetime | None = None


class IngestResponse(BaseModel):
    ticket_id: int
    external_id: str
    created: bool  # True = new ticket, False = updated existing


class TicketStatusSnapshot(BaseModel):
    """One ticket's current Aegis status, for a source system's own drift
    reconciliation sweep (see Aegis #1436/#1437 — the whole reason to check
    for drift is that a bug can silently desync the two sides)."""

    external_id: str
    status: str
    last_synced_at: datetime


# ── Alert contract v1 (docs/alert-ingest.md) ─────────────────────────────────

ALERT_CONTRACT_VERSION = 1


class AlertStatus(StrEnum):
    FIRING = "firing"
    RESOLVED = "resolved"


class AlertPriority(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class AlertResult(StrEnum):
    CREATED = "created"
    OCCURRENCE = "occurrence"
    DUPLICATE = "duplicate"
    RESOLVED_NOTED = "resolved_noted"
    IGNORED = "ignored"


class AlertIngestPayload(BaseModel):
    """One alert event from a monitoring source (sources.kind = "alert")."""

    contract_version: Literal[1] = 1
    # Unique per event and per source: a retry of the same event is applied once.
    # Also the external_id of the ticket this event opens.
    event_id: str = Field(..., min_length=1, max_length=100)
    # Identifies the problem: same fingerprint while a ticket is open = occurrence.
    fingerprint: str = Field(..., min_length=1, max_length=200)
    status: AlertStatus = AlertStatus.FIRING
    priority: AlertPriority = AlertPriority.MEDIUM
    type: str = Field("bug", max_length=50)
    subject: str = Field(..., min_length=1, max_length=500)
    description: str | None = None
    occurred_at: datetime | None = None
    metadata: dict[str, Any] | None = None


class AlertIngestResponse(BaseModel):
    contract_version: int = ALERT_CONTRACT_VERSION
    result: AlertResult
    ticket_id: int | None
    external_id: str | None
    occurrence_count: int | None
    previous_ticket_id: int | None = None
