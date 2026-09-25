from __future__ import annotations

from fastapi import APIRouter, status

from app.core.auth import CurrentSource
from app.core.dependencies import DbSession
from app.schemas.ingest import (
    IngestResponse,
    TicketEventPayload,
    TicketIngestPayload,
    TicketStatusSnapshot,
)
from app.services.ingest_service import IngestService
from app.services.status_mapping import status_for_source

router = APIRouter(prefix="/v1/ingest", tags=["ingest"])


@router.post(
    "/tickets",
    status_code=status.HTTP_200_OK,
    response_model=IngestResponse,
    summary="Ingest or update a ticket from a source system",
)
async def ingest_ticket(
    data: TicketIngestPayload,
    source: CurrentSource,
    db: DbSession,
) -> IngestResponse:
    """
    Idempotent upsert: if `external_id` already exists for this source, the ticket
    is updated. Otherwise a new ticket is created and 201 is returned implicitly via
    the `created` flag in the response body.
    """
    ticket, created = await IngestService(db).upsert_ticket(source, data)
    return IngestResponse(
        ticket_id=ticket.id,
        # Echo the request's own external_id, not ticket.external_id — #1287's merge
        # redirect can land this update on a different (target) ticket, whose
        # external_id would otherwise silently diverge from what was submitted.
        external_id=data.external_id,
        created=created,
    )


@router.post(
    "/tickets/events",
    status_code=status.HTTP_201_CREATED,
    summary="Record a discrete ticket event from a source system",
)
async def ingest_ticket_event(
    data: TicketEventPayload,
    source: CurrentSource,
    db: DbSession,
) -> dict[str, int]:
    event = await IngestService(db).record_event(source, data)
    return {"event_id": event.id}


@router.get(
    "/tickets/status",
    response_model=list[TicketStatusSnapshot],
    summary="Snapshot of this source's tickets' current status, for drift reconciliation",
)
async def ticket_status_snapshot(
    source: CurrentSource,
    db: DbSession,
) -> list[TicketStatusSnapshot]:
    """A source system calls this periodically to compare against its own local
    state and catch drift the normal push-based sync missed — the failure mode
    that motivated this endpoint (Aegis #1436/#1437): a bug on either side can
    silently stop a ticket's status from ever reaching the other system again,
    with nothing erroring or logging loudly enough to notice."""
    tickets = await IngestService(db).list_status_snapshot(source)
    return [
        TicketStatusSnapshot(
            external_id=t.external_id,
            status=status_for_source(t.status),
            last_synced_at=t.last_synced_at,
        )
        for t in tickets
    ]
