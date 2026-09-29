from __future__ import annotations

import uuid
from pathlib import Path

import pytest
from httpx import AsyncClient

from app.core.config import settings


def unique_slug() -> str:
    return f"src-{uuid.uuid4().hex[:8]}"


def unique_external_id() -> str:
    return f"SUP-2026-{uuid.uuid4().hex[:6].upper()}"


@pytest.fixture(autouse=True)
def _isolated_upload_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "upload_dir", str(tmp_path))


@pytest.fixture
async def ticket_id(admin_client: AsyncClient, client: AsyncClient) -> int:
    source = await admin_client.post(
        "/v1/sources", json={"name": "Attachment Test Source", "slug": unique_slug()}
    )
    assert source.status_code == 201
    resp = await client.post(
        "/v1/ingest/tickets",
        headers={"X-Aegis-Key": source.json()["api_key"]},
        json={
            "external_id": unique_external_id(),
            "type": "bug",
            "priority": "high",
            "status": "open",
            "subject": "Ticket with attachments",
        },
    )
    assert resp.status_code == 200
    return resp.json()["ticket_id"]


def _pdf(name: str = "doc.pdf") -> dict:
    return {"file": (name, b"%PDF-1.4 test", "application/pdf")}


@pytest.mark.asyncio
async def test_panel_upload_defaults_to_public(admin_client: AsyncClient, ticket_id: int) -> None:
    resp = await admin_client.post(f"/v1/tickets/{ticket_id}/attachments", files=_pdf())
    assert resp.status_code == 201
    assert resp.json()["is_internal"] is False


@pytest.mark.asyncio
async def test_panel_upload_can_be_marked_internal(
    admin_client: AsyncClient, ticket_id: int
) -> None:
    resp = await admin_client.post(
        f"/v1/tickets/{ticket_id}/attachments", files=_pdf(), data={"is_internal": "true"}
    )
    assert resp.status_code == 201
    assert resp.json()["is_internal"] is True

    listed = await admin_client.get(f"/v1/tickets/{ticket_id}/attachments")
    assert [a["is_internal"] for a in listed.json()] == [True]


@pytest.mark.asyncio
async def test_internal_note_attachment_inherits_internal_flag(
    admin_client: AsyncClient, ticket_id: int
) -> None:
    resp = await admin_client.post(
        f"/v1/tickets/{ticket_id}/messages",
        data={"body": "nota com anexo", "is_internal": "true"},
        files=_pdf(),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["is_internal"] is True
    assert [a["is_internal"] for a in body["attachments"]] == [True]

    listed = await admin_client.get(f"/v1/tickets/{ticket_id}/attachments")
    assert [a["is_internal"] for a in listed.json()] == [True]


@pytest.mark.asyncio
async def test_public_reply_attachment_stays_public(
    admin_client: AsyncClient, ticket_id: int
) -> None:
    resp = await admin_client.post(
        f"/v1/tickets/{ticket_id}/messages",
        data={"body": "resposta com anexo", "is_internal": "false"},
        files=_pdf(),
    )
    assert resp.status_code == 201
    assert [a["is_internal"] for a in resp.json()["attachments"]] == [False]


@pytest.mark.asyncio
async def test_message_list_exposes_attachment_flag(
    admin_client: AsyncClient, ticket_id: int
) -> None:
    await admin_client.post(
        f"/v1/tickets/{ticket_id}/messages",
        data={"body": "nota", "is_internal": "true"},
        files=_pdf("interno.pdf"),
    )
    await admin_client.post(
        f"/v1/tickets/{ticket_id}/messages",
        data={"body": "resposta", "is_internal": "false"},
        files=_pdf("publico.pdf"),
    )

    listed = await admin_client.get(f"/v1/tickets/{ticket_id}/messages")
    by_filename = {a["filename"]: a["is_internal"] for m in listed.json() for a in m["attachments"]}
    assert by_filename == {"interno.pdf": True, "publico.pdf": False}
