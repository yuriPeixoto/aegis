from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.canned_response import CannedResponse
from app.models.ticket import Ticket
from app.schemas.source import SourceCreate
from app.services.source_service import SourceService


def unique_slug() -> str:
    return f"cr-{uuid.uuid4().hex[:8]}"


@pytest.mark.asyncio
async def test_create_canned_response(admin_client: AsyncClient, admin_token_headers: dict) -> None:
    payload = {
        "title": "Test Canned",
        "body": "Hello {{ticket.requester.name}}",
        "actions": {
            "status": "resolved",
            "priority": "low",
        },
    }
    response = await admin_client.post("/v1/canned-responses", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Canned"
    assert data["actions"]["status"] == "resolved"


@pytest.mark.asyncio
async def test_apply_canned_response(
    admin_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    # Create a source directly via service so we have a source_id
    source, _, _ = await SourceService(db_session).create(
        SourceCreate(name="Canned Test Source", slug=unique_slug())
    )

    # Create a ticket directly in the DB
    ticket = Ticket(
        source_id=source.id,
        external_id=f"EXT-CANNED-{uuid.uuid4().hex[:6]}",
        status="open",
        priority="high",
        subject="Apply Test",
        source_metadata={"requester_name": "John Doe"},
    )
    db_session.add(ticket)
    await db_session.commit()
    await db_session.refresh(ticket)

    # Create canned response directly in DB
    canned = CannedResponse(
        title="Resolve Template",
        body="Closing this, {{ticket.requester.name}}.",
        actions={"status": "resolved", "priority": "low"},
    )
    db_session.add(canned)
    await db_session.commit()
    await db_session.refresh(canned)

    # Apply via API
    response = await admin_client.post(
        "/v1/canned-responses/apply",
        json={"ticket_id": ticket.id, "canned_response_id": canned.id},
    )
    assert response.status_code == 200
    data = response.json()
    assert "Closing this, John Doe." in data["body"]

    # Verify ticket state updated
    await db_session.refresh(ticket)
    assert ticket.status == "resolved"
    assert ticket.priority == "low"
