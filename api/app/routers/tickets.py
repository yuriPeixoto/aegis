from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, HTTPException, Query, status

from app.core.dependencies import DbSession
from app.schemas.ticket import TicketDetailResponse, TicketListResponse, TicketResponse
from app.services.ticket_service import TicketService

router = APIRouter(prefix="/v1/tickets", tags=["tickets"])


@router.get("", response_model=TicketListResponse)
async def list_tickets(
    db: DbSession,
    source_id: int | None = Query(None),
    status: str | None = Query(None),
    priority: str | None = Query(None),
    type: str | None = Query(None),
    created_after: datetime | None = Query(None),
    created_before: datetime | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> TicketListResponse:
    tickets, total = await TicketService(db).list_tickets(
        source_id=source_id,
        status=status,
        priority=priority,
        type=type,
        created_after=created_after,
        created_before=created_before,
        limit=limit,
        offset=offset,
    )

    items = []
    for t in tickets:
        items.append(
            TicketResponse(
                id=t.id,
                source_id=t.source_id,
                source_name=t.source.name if t.source else "",
                external_id=t.external_id,
                type=t.type,
                priority=t.priority,
                status=t.status,
                subject=t.subject,
                description=t.description,
                source_metadata=t.source_metadata,
                source_created_at=t.source_created_at,
                source_updated_at=t.source_updated_at,
                first_ingested_at=t.first_ingested_at,
                last_synced_at=t.last_synced_at,
            )
        )

    return TicketListResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/{ticket_id}", response_model=TicketDetailResponse)
async def get_ticket(ticket_id: int, db: DbSession) -> TicketDetailResponse:
    ticket = await TicketService(db).get_ticket(ticket_id)
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    return TicketDetailResponse(
        id=ticket.id,
        source_id=ticket.source_id,
        source_name=ticket.source.name if ticket.source else "",
        external_id=ticket.external_id,
        type=ticket.type,
        priority=ticket.priority,
        status=ticket.status,
        subject=ticket.subject,
        description=ticket.description,
        source_metadata=ticket.source_metadata,
        source_created_at=ticket.source_created_at,
        source_updated_at=ticket.source_updated_at,
        first_ingested_at=ticket.first_ingested_at,
        last_synced_at=ticket.last_synced_at,
        events=[
            {
                "id": e.id,
                "event_type": e.event_type,
                "payload": e.payload,
                "occurred_at": e.occurred_at,
            }
            for e in ticket.events
        ],
    )
