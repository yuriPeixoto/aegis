from __future__ import annotations
import pytest
from httpx import AsyncClient
from tests.test_tickets import unique_slug, unique_external_id

@pytest.fixture
async def two_tickets(client: AsyncClient) -> list[int]:
    # Create source
    resp = await client.post(
        "/v1/sources",
        json={"name": "Bulk Test Source", "slug": unique_slug()},
    )
    api_key = resp.json()["api_key"]
    
    ids = []
    for _ in range(2):
        resp = await client.post(
            "/v1/ingest/tickets",
            headers={"X-Aegis-Key": api_key},
            json={
                "external_id": unique_external_id(),
                "type": "bug",
                "priority": "low",
                "status": "open",
                "subject": "Bulk test",
            },
        )
        ids.append(resp.json()["ticket_id"])
    return ids

@pytest.mark.asyncio
async def test_bulk_update_status_and_priority(client: AsyncClient, two_tickets: list[int]) -> None:
    resp = await client.post(
        "/v1/tickets/bulk-update",
        json={
            "ticket_ids": two_tickets,
            "status": "in_progress",
            "priority": "urgent",
            "comment": "Bulk update test"
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    for ticket in data:
        assert ticket["id"] in two_tickets
        assert ticket["status"] == "in_progress"
        assert ticket["priority"] == "urgent"

    # Verify events were created
    for tid in two_tickets:
        resp = await client.get(f"/v1/tickets/{tid}")
        events = resp.json()["events"]
        # Should have: created, status_changed, priority_changed
        event_types = [e["event_type"] for e in events]
        assert "status_changed" in event_types
        assert "priority_changed" in event_types
        
        # Verify comment in status_changed event
        status_event = next(e for e in events if e["event_type"] == "status_changed")
        assert status_event["payload"]["new_status"] == "in_progress"
        assert status_event["payload"]["comment"] == "Bulk update test"

@pytest.mark.asyncio
async def test_bulk_update_assignee(client: AsyncClient, two_tickets: list[int]) -> None:
    # First, we need a user to assign to. 
    # Current user in tests (setup in conftest) is usually available.
    # Let's get the current user ID.
    resp = await client.get("/v1/auth/me")
    user_id = resp.json()["id"]

    resp = await client.post(
        "/v1/tickets/bulk-update",
        json={
            "ticket_ids": two_tickets,
            "assigned_to_user_id": user_id
        }
    )
    assert resp.status_code == 200
    for ticket in resp.json():
        assert ticket["assigned_to"]["id"] == user_id

@pytest.mark.asyncio
async def test_bulk_update_invalid_priority(client: AsyncClient, two_tickets: list[int]) -> None:
    resp = await client.post(
        "/v1/tickets/bulk-update",
        json={
            "ticket_ids": two_tickets,
            "priority": "invalid-priority"
        }
    )
    assert resp.status_code == 422
