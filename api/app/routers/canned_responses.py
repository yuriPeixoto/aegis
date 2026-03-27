from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from app.core.auth import CurrentUser, AdminUser
from app.core.dependencies import DbSession
from app.schemas.canned_response import (
    CannedResponseCreate,
    CannedResponseUpdate,
    CannedResponseResponse,
    ApplyCannedResponseRequest,
)
from app.services.canned_response_service import CannedResponseService
from app.services.ticket_service import TicketService
from app.services.message_service import MessageService
from app.services.webhook_service import dispatch_webhook
from app.routers.messages import MessageResponse, _to_response

router = APIRouter(prefix="/v1/canned-responses", tags=["canned-responses"])


@router.get("", response_model=list[CannedResponseResponse])
async def list_canned_responses(
    db: DbSession, _user: CurrentUser
) -> list[CannedResponseResponse]:
    return await CannedResponseService(db).list_responses()


@router.post(
    "",
    response_model=CannedResponseResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_canned_response(
    body: CannedResponseCreate,
    db: DbSession,
    user: CurrentUser,
) -> CannedResponseResponse:
    return await CannedResponseService(db).create_response(body, user.id)


@router.get("/{response_id}", response_model=CannedResponseResponse)
async def get_canned_response(
    response_id: int, db: DbSession, _user: CurrentUser
) -> CannedResponseResponse:
    response = await CannedResponseService(db).get_response(response_id)
    if not response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Canned response not found"
        )
    return response


@router.patch("/{response_id}", response_model=CannedResponseResponse)
async def update_canned_response(
    response_id: int,
    body: CannedResponseUpdate,
    db: DbSession,
    _user: CurrentUser,  # Any agent can update for now, or restrict to AdminUser
) -> CannedResponseResponse:
    response = await CannedResponseService(db).update_response(response_id, body)
    if not response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Canned response not found"
        )
    return response


@router.delete("/{response_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_canned_response(
    response_id: int, db: DbSession, _user: AdminUser
):
    success = await CannedResponseService(db).delete_response(response_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Canned response not found"
        )


@router.post("/apply", response_model=MessageResponse)
async def apply_canned_response(
    body: ApplyCannedResponseRequest,
    db: DbSession,
    current_user: CurrentUser,
    background_tasks: BackgroundTasks,
) -> MessageResponse:
    svc = CannedResponseService(db)
    ticket_svc = TicketService(db)
    msg_svc = MessageService(db)

    canned = await svc.get_response(body.canned_response_id)
    if not canned:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Canned response not found"
        )

    ticket = await ticket_svc.get_ticket(body.ticket_id)
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found"
        )

    # 1. Substitute variables in body
    final_body = svc.substitute_variables(canned.body, ticket, current_user)

    # 2. Apply actions if present
    if canned.actions:
        actions = canned.actions
        old_status = ticket.status
        # We use bulk_update logic for simplicity even for a single ticket
        await ticket_svc.bulk_update(
            [ticket.id],
            status=actions.get("status"),
            priority=actions.get("priority"),
            assigned_to_user_id=actions.get("assigned_to_user_id"),
            changed_by_user_name=current_user.name,
            comment=f"Applied canned response: {canned.title}",
        )
        # Reload ticket to get updated state for webhook
        ticket = await ticket_svc.get_ticket(ticket.id)

        # Dispatch status webhook if it changed
        new_status = actions.get("status")
        if new_status and new_status != old_status and ticket.source and ticket.source.webhook_url:
            background_tasks.add_task(
                dispatch_webhook,
                webhook_url=ticket.source.webhook_url,
                webhook_secret=ticket.source.webhook_secret,
                event_type="status_changed",
                payload={
                    "external_id": ticket.external_id,
                    "status": new_status,
                    "changed_by": current_user.name,
                },
            )

    # 3. Send the message (reply)
    message = await msg_svc.create_outbound(ticket, final_body, current_user.name)

    # 4. Trigger webhook if source has one
    if ticket.source and ticket.source.webhook_url:
        background_tasks.add_task(
            dispatch_webhook,
            webhook_url=ticket.source.webhook_url,
            webhook_secret=ticket.source.webhook_secret,
            event_type="agent_reply",
            payload={
                "external_id": ticket.external_id,
                "body": final_body,
                "agent_name": current_user.name,
                "attachments": [],
            },
        )

    # Reload message with attachments (if any, though apply-canned doesn't support them yet)
    message = await msg_svc.get_with_attachments(message.id)
    return _to_response(message)
