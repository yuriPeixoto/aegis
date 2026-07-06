from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, HTTPException, status

from app.core.auth import CurrentUser
from app.core.dependencies import DbSession
from app.models.ticket import Ticket
from app.models.ticket_event import TicketEvent
from app.schemas.checklist import (
    ChecklistItemResponse,
    CreateChecklistItemRequest,
    UpdateChecklistItemRequest,
)
from app.services.checklist_service import ChecklistService
from app.services.ticket_service import TicketService
from app.services.webhook_service import dispatch_webhook

router = APIRouter(prefix="/v1/tickets", tags=["checklist"])


async def _get_ticket_or_404(db: DbSession, ticket_id: int) -> Ticket:
    ticket = await TicketService(db).get_ticket(ticket_id)
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return ticket


def _notify_checklist_updated(background_tasks: BackgroundTasks, ticket: Ticket) -> None:
    """Sends the client system (GF) the full checklist snapshot — mirrors GitHub/ClickUp,
    where the reporter always sees current items + progress, never individual diffs."""
    if not (ticket.source and ticket.source.webhook_url):
        return

    items = sorted(ticket.checklist_items, key=lambda i: i.position)
    background_tasks.add_task(
        dispatch_webhook,
        webhook_url=ticket.source.webhook_url,
        webhook_secret=ticket.source.webhook_secret,
        event_type="checklist_updated",
        payload={
            "external_id": ticket.external_id,
            "items": [{"text": i.text, "is_done": i.is_done} for i in items],
            "done": sum(1 for i in items if i.is_done),
            "total": len(items),
        },
        webhook_url_internal=ticket.source.webhook_url_internal,
    )


@router.post(
    "/{ticket_id}/checklist",
    response_model=ChecklistItemResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_checklist_item(
    ticket_id: int,
    body: CreateChecklistItemRequest,
    db: DbSession,
    current_user: CurrentUser,
    background_tasks: BackgroundTasks,
) -> ChecklistItemResponse:
    ticket = await _get_ticket_or_404(db, ticket_id)

    item = await ChecklistService(db).create_item(
        ticket_id, body.text, created_by=current_user.id
    )
    db.add(
        TicketEvent(
            ticket_id=ticket_id,
            event_type="checklist_item_added",
            payload={"text": body.text, "added_by": current_user.name},
        )
    )
    await db.commit()

    ticket = await _get_ticket_or_404(db, ticket_id)
    _notify_checklist_updated(background_tasks, ticket)

    return ChecklistItemResponse.model_validate(item)


@router.patch("/{ticket_id}/checklist/{item_id}", response_model=ChecklistItemResponse)
async def update_checklist_item(
    ticket_id: int,
    item_id: int,
    body: UpdateChecklistItemRequest,
    db: DbSession,
    current_user: CurrentUser,
    background_tasks: BackgroundTasks,
) -> ChecklistItemResponse:
    ticket = await _get_ticket_or_404(db, ticket_id)

    item = await ChecklistService(db).update_item(
        ticket_id,
        item_id,
        text=body.text,
        is_done=body.is_done,
        done_by=current_user.id,
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    if body.is_done is not None:
        db.add(
            TicketEvent(
                ticket_id=ticket_id,
                event_type="checklist_item_toggled",
                payload={
                    "text": item.text,
                    "is_done": body.is_done,
                    "changed_by": current_user.name,
                },
            )
        )
        await db.commit()

    if body.is_done is not None or body.text is not None:
        ticket = await _get_ticket_or_404(db, ticket_id)
        _notify_checklist_updated(background_tasks, ticket)

    return ChecklistItemResponse.model_validate(item)


@router.delete("/{ticket_id}/checklist/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_checklist_item(
    ticket_id: int,
    item_id: int,
    db: DbSession,
    _current_user: CurrentUser,
    background_tasks: BackgroundTasks,
) -> None:
    ticket = await _get_ticket_or_404(db, ticket_id)

    deleted = await ChecklistService(db).delete_item(ticket_id, item_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    ticket = await _get_ticket_or_404(db, ticket_id)
    _notify_checklist_updated(background_tasks, ticket)
