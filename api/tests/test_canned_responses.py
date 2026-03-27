import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import ROLE_ADMIN, ROLE_AGENT
from app.models.ticket import Ticket
from app.models.canned_response import CannedResponse

@pytest.mark.asyncio
async def test_create_canned_response(client: AsyncClient, admin_token_headers: dict):
    payload = {
        "title": "Test Canned",
        "body": "Hello {{ticket.requester.name}}",
        "actions": {
            "status": "resolved",
            "priority": "low"
        }
    }
    response = await client.post("/v1/canned-responses", json=payload, headers=admin_token_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Canned"
    assert data["actions"]["status"] == "resolved"

@pytest.mark.asyncio
async def test_apply_canned_response(client: AsyncClient, admin_token_headers: dict, db_session: AsyncSession):
    # 1. Create a ticket
    from app.models.source import Source
    source = (await db_session.execute(sa.select(Source).limit(1))).scalar()
    
    ticket = Ticket(
        source_id=source.id,
        external_id="EXT-CANNED-1",
        status="open",
        priority="high",
        subject="Apply Test",
        source_metadata={"requester_name": "John Doe"}
    )
    db_session.add(ticket)
    await db_session.commit()
    await db_session.refresh(ticket)

    # 2. Create canned response
    canned = CannedResponse(
        title="Resolve Template",
        body="Closing this, {{ticket.requester.name}}.",
        actions={"status": "resolved", "priority": "low"}
    )
    db_session.add(canned)
    await db_session.commit()
    await db_session.refresh(canned)

    # 3. Apply
    payload = {
        "ticket_id": ticket.id,
        "canned_response_id": canned.id
    }
    response = await client.post("/v1/canned-responses/apply", json=payload, headers=admin_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert "Closing this, John Doe." in data["body"]

    # 4. Verify ticket state
    await db_session.refresh(ticket)
    assert ticket.status == "resolved"
    assert ticket.priority == "low"

import sqlalchemy as sa
