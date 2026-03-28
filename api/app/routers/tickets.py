from __future__ import annotations

import random
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, status

from app.core.auth import CurrentUser
from app.core.dependencies import DbSession
from app.core.auth import AdminUser
from app.schemas.ticket import (
    AssigneeResponse,
    AssignTicketRequest,
    InternalTicketCreate,
    MergeTicketRequest,
    OverrideSlaRequest,
    TicketDetailResponse,
    TicketListResponse,
    TicketResponse,
    UpdatePriorityRequest,
    UpdateStatusRequest,
    BulkUpdateTicketsRequest,
    TicketTagsUpdateRequest,
)
from app.schemas.tag import TagResponse
from app.services.ticket_service import TicketService
from app.services.webhook_service import dispatch_webhook

router = APIRouter(prefix="/v1/tickets", tags=["tickets"])


def _assignee(ticket) -> AssigneeResponse | None:  # type: ignore[no-untyped-def]
    if ticket.assignee is None:
        return None
    return AssigneeResponse(id=ticket.assignee.id, name=ticket.assignee.name)


def _detail(ticket) -> TicketDetailResponse:  # type: ignore[no-untyped-def]
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
        sla_due_at=ticket.sla_due_at,
        sla_started_at=ticket.sla_started_at,
        sla_paused_seconds=ticket.sla_paused_seconds or 0,
        sla_paused_since=ticket.sla_paused_since,
        assigned_to=_assignee(ticket),
        tags=[
            TagResponse.model_validate(t)
            for t in ticket.tags
        ],
        merged_into_ticket_id=ticket.merged_into_ticket_id,
        merged_at=ticket.merged_at,
        csat_rating=ticket.csat_rating,
        csat_comment=ticket.csat_comment,
        csat_submitted_at=ticket.csat_submitted_at,
        csat_requested_at=ticket.csat_requested_at,
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


@router.get("", response_model=TicketListResponse)
async def list_tickets(
    db: DbSession,
    source_id: int | None = Query(None),
    status: str | None = Query(None),
    priority: str | None = Query(None),
    type: str | None = Query(None),
    assigned_to_user_id: int | None = Query(None),
    unassigned: bool = Query(False),
    active_only: bool = Query(False),
    search: str | None = Query(None),
    created_after: datetime | None = Query(None),
    created_before: datetime | None = Query(None),
    tag_ids: list[int] | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> TicketListResponse:
    tickets, total, inbound_map = await TicketService(db).list_tickets(
        source_id=source_id,
        status=status,
        priority=priority,
        type=type,
        assigned_to_user_id=assigned_to_user_id,
        unassigned=unassigned,
        active_only=active_only,
        search=search,
        created_after=created_after,
        created_before=created_before,
        tag_ids=tag_ids,
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
                sla_due_at=t.sla_due_at,
                last_inbound_at=inbound_map.get(t.id),
                assigned_to=_assignee(t),
                tags=[TagResponse.model_validate(tag) for tag in t.tags],
            )
        )

    return TicketListResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/{ticket_id}", response_model=TicketDetailResponse)
async def get_ticket(ticket_id: int, db: DbSession) -> TicketDetailResponse:
    ticket = await TicketService(db).get_ticket(ticket_id)
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    return _detail(ticket)


@router.post("/internal", response_model=TicketDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_internal_ticket(
    body: InternalTicketCreate,
    db: DbSession,
    current_user: CurrentUser,
) -> TicketDetailResponse:
    ticket = await TicketService(db).create_internal_ticket(
        subject=body.subject,
        description=body.description,
        type=body.type,
        priority=body.priority,
        user_id=current_user.id,
        meta=body.meta,
    )
    return _detail(ticket)


@router.patch("/{ticket_id}/status", response_model=TicketDetailResponse)
async def update_ticket_status(
    ticket_id: int,
    body: UpdateStatusRequest,
    db: DbSession,
    current_user: CurrentUser,
    background_tasks: BackgroundTasks,
) -> TicketDetailResponse:
    ticket, error = await TicketService(db).update_ticket_status(
        ticket_id,
        body.status,
        changed_by_user_id=current_user.id,
        comment=body.comment,
    )
    if error == "not_found":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    if error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=error)

    if ticket.source and ticket.source.webhook_url:
        background_tasks.add_task(
            dispatch_webhook,
            webhook_url=ticket.source.webhook_url,
            webhook_secret=ticket.source.webhook_secret,
            event_type="status_changed",
            payload={
                "external_id": ticket.external_id,
                "status": body.status,
                "changed_by": current_user.name,
            },
        )

    # CSAT request: send when ticket is resolved/closed and source has CSAT enabled
    _CSAT_TRIGGER_STATUSES = {"resolved", "closed"}
    if (
        body.status in _CSAT_TRIGGER_STATUSES
        and ticket.source
        and ticket.source.webhook_url
        and ticket.source.csat_enabled
        and ticket.csat_submitted_at is None  # don't re-request if already rated
        and random.randint(1, 100) <= ticket.source.csat_sampling_pct
    ):
        from datetime import UTC

        ticket.csat_requested_at = datetime.now(UTC)
        await db.commit()

        background_tasks.add_task(
            dispatch_webhook,
            webhook_url=ticket.source.webhook_url,
            webhook_secret=ticket.source.webhook_secret,
            event_type="csat_request",
            payload={
                "external_id": ticket.external_id,
                "ticket_id": ticket.id,
            },
        )

    return _detail(ticket)


@router.patch("/{ticket_id}/assign", response_model=TicketDetailResponse)
async def assign_ticket(
    ticket_id: int,
    body: AssignTicketRequest,
    db: DbSession,
    current_user: CurrentUser,
    background_tasks: BackgroundTasks,
) -> TicketDetailResponse:
    ticket = await TicketService(db).assign_ticket(ticket_id, body.user_id)
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    if ticket.source and ticket.source.webhook_url:
        agent_name = ticket.assignee.name if ticket.assignee else current_user.name
        background_tasks.add_task(
            dispatch_webhook,
            webhook_url=ticket.source.webhook_url,
            webhook_secret=ticket.source.webhook_secret,
            event_type="assigned",
            payload={
                "external_id": ticket.external_id,
                "assigned_to_name": agent_name,
            },
        )

    return _detail(ticket)


@router.patch("/{ticket_id}/sla", response_model=TicketDetailResponse)
async def override_sla(
    ticket_id: int,
    body: OverrideSlaRequest,
    db: DbSession,
    admin: AdminUser,
    background_tasks: BackgroundTasks,
) -> TicketDetailResponse:
    """Override the SLA deadline for a ticket. Restricted to admin."""
    svc = TicketService(db)
    ticket = await svc.get_ticket(ticket_id)
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    from app.models.ticket_event import TicketEvent
    from app.services.sla_service import SlaService

    old_priority = ticket.priority
    sla_svc = SlaService(db)
    await sla_svc.override_due_at(ticket, body.due_at)

    new_priority = await sla_svc.infer_priority_for_deadline(body.due_at)

    events: list[TicketEvent] = [
        TicketEvent(
            ticket_id=ticket_id,
            event_type="sla_overridden",
            payload={
                "new_due_at": body.due_at.isoformat(),
                **({"reason": body.reason} if body.reason else {}),
            },
        )
    ]

    if new_priority and new_priority != old_priority:
        ticket.priority = new_priority
        events.append(
            TicketEvent(
                ticket_id=ticket_id,
                event_type="priority_changed",
                payload={
                    "old_priority": old_priority,
                    "new_priority": new_priority,
                    "changed_by": admin.name,
                    "reason": "SLA override",
                },
            )
        )

    for event in events:
        db.add(event)
    await db.commit()

    if ticket.source and ticket.source.webhook_url:
        background_tasks.add_task(
            dispatch_webhook,
            webhook_url=ticket.source.webhook_url,
            webhook_secret=ticket.source.webhook_secret,
            event_type="deadline_updated",
            payload={
                "external_id": ticket.external_id,
                "sla_due_at": body.due_at.isoformat(),
                "changed_by": admin.name,
                **({"reason": body.reason} if body.reason else {}),
            },
        )

    ticket = await svc.get_ticket(ticket_id)
    return _detail(ticket)


@router.put("/{ticket_id}/tags", response_model=TicketDetailResponse)
async def update_ticket_tags(
    ticket_id: int,
    body: TicketTagsUpdateRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> TicketDetailResponse:
    """Update tags for a ticket."""
    ticket = await TicketService(db).update_tags(
        ticket_id=ticket_id,
        tag_ids=body.tag_ids,
        changed_by=current_user.name
    )
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    
    return _detail(ticket)


_VALID_PRIORITIES = {"low", "medium", "high", "urgent"}


@router.patch("/{ticket_id}/priority", response_model=TicketDetailResponse)
async def update_ticket_priority(
    ticket_id: int,
    body: UpdatePriorityRequest,
    db: DbSession,
    current_user: CurrentUser,
    background_tasks: BackgroundTasks,
) -> TicketDetailResponse:
    """Override the priority of a ticket."""
    if body.priority not in _VALID_PRIORITIES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid priority. Must be one of: {', '.join(sorted(_VALID_PRIORITIES))}",
        )

    from app.models.ticket_event import TicketEvent

    svc = TicketService(db)
    ticket = await svc.get_ticket(ticket_id)
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    old_priority = ticket.priority
    ticket.priority = body.priority
    db.add(
        TicketEvent(
            ticket_id=ticket_id,
            event_type="priority_changed",
            payload={
                "old_priority": old_priority,
                "new_priority": body.priority,
                "changed_by": current_user.name,
            },
        )
    )
    await db.commit()

    ticket = await svc.get_ticket(ticket_id)
    return _detail(ticket)


@router.post("/bulk-update", response_model=list[TicketResponse])
async def bulk_update_tickets(
    body: BulkUpdateTicketsRequest,
    db: DbSession,
    current_user: CurrentUser,
    background_tasks: BackgroundTasks,
) -> list[TicketResponse]:
    """Update multiple tickets at once."""
    if body.priority and body.priority not in _VALID_PRIORITIES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid priority: {body.priority}",
        )

    svc = TicketService(db)
    updated_tickets = await svc.bulk_update(
        ticket_ids=body.ticket_ids,
        status=body.status,
        priority=body.priority,
        assigned_to_user_id=body.assigned_to_user_id,
        changed_by_user_name=current_user.name,
        comment=body.comment,
    )

    # Dispatch webhooks for each updated ticket
    for ticket in updated_tickets:
        if ticket.source and ticket.source.webhook_url:
            # Determine which webhooks to send based on what changed
            if body.status:
                background_tasks.add_task(
                    dispatch_webhook,
                    webhook_url=ticket.source.webhook_url,
                    webhook_secret=ticket.source.webhook_secret,
                    event_type="status_updated",
                    payload={
                        "external_id": ticket.external_id,
                        "status": body.status,
                        "changed_by": current_user.name,
                        **({"comment": body.comment} if body.comment else {}),
                    },
                )
            if body.priority:
                background_tasks.add_task(
                    dispatch_webhook,
                    webhook_url=ticket.source.webhook_url,
                    webhook_secret=ticket.source.webhook_secret,
                    event_type="priority_updated",
                    payload={
                        "external_id": ticket.external_id,
                        "priority": body.priority,
                        "changed_by": current_user.name,
                    },
                )
            if body.assigned_to_user_id is not None:
                agent_name = ticket.assignee.name if ticket.assignee else "Unassigned"
                background_tasks.add_task(
                    dispatch_webhook,
                    webhook_url=ticket.source.webhook_url,
                    webhook_secret=ticket.source.webhook_secret,
                    event_type="assigned",
                    payload={
                        "external_id": ticket.external_id,
                        "assigned_to_name": agent_name,
                    },
                )

    return updated_tickets


@router.post("/{ticket_id}/merge", response_model=TicketDetailResponse)
async def merge_ticket(
    ticket_id: int,
    body: MergeTicketRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> TicketDetailResponse:
    """Merge ticket_id (duplicate/secondary) into body.target_ticket_id (primary).
    All messages are moved to the target. Source becomes status='merged'. Irreversible.
    """
    ticket, error = await TicketService(db).merge_ticket(
        source_ticket_id=ticket_id,
        target_ticket_id=body.target_ticket_id,
        merged_by_name=current_user.name,
    )
    if error == "cannot_merge_into_self":
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail="Um ticket não pode ser mesclado nele mesmo.")
    if error in ("source_not_found", "target_not_found"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket não encontrado.")
    if error == "source_already_merged":
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail="Este ticket já foi mesclado em outro.")
    if error == "target_already_merged":
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail="O ticket de destino já foi mesclado — escolha o ticket principal.")
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Merge failed.")

    return _detail(ticket)
