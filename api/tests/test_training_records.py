from __future__ import annotations

import pytest
from httpx import AsyncClient


def _record_payload(instructor_id: int, **overrides: object) -> dict:
    payload = {
        "training_name": "Treinamento Checklist Suite",
        "system_module": "Checklist Suite",
        "version": "2.18",
        "training_date": "2026-09-01",
        "start_time": "14:00",
        "end_time": "16:00",
        "workload_hours": "2h",
        "modality": "presencial",
        "training_type": "inicial",
        "area_sector": "Operações",
        "instructor_user_id": instructor_id,
        "instructor_title": "QA",
        "modules": [{"module": "Checklist Express", "subjects": "Criação e assinatura"}],
        "evaluation_method": "Observação prática",
    }
    payload.update(overrides)
    return payload


TINY_PNG = (
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk"
    "+A8AAQUBAScY42YAAAAASUVORK5CYII="
)


@pytest.mark.asyncio
async def test_list_requires_auth(client: AsyncClient) -> None:
    response = await client.get("/v1/training-records")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_and_get_training_record(admin_client: AsyncClient, admin_user: dict) -> None:
    resp = await admin_client.post(
        "/v1/training-records", json=_record_payload(admin_user["id"])
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["training_name"] == "Treinamento Checklist Suite"
    assert data["status"] == "draft"
    assert data["modules"][0]["module"] == "Checklist Express"
    assert data["participants"] == []

    get_resp = await admin_client.get(f"/v1/training-records/{data['id']}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == data["id"]


@pytest.mark.asyncio
async def test_create_rejects_invalid_modality(admin_client: AsyncClient, admin_user: dict) -> None:
    resp = await admin_client.post(
        "/v1/training-records", json=_record_payload(admin_user["id"], modality="hybrid")
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_list_includes_participant_counts(
    admin_client: AsyncClient, admin_user: dict
) -> None:
    create_resp = await admin_client.post(
        "/v1/training-records", json=_record_payload(admin_user["id"])
    )
    record_id = create_resp.json()["id"]
    await admin_client.post(
        f"/v1/training-records/{record_id}/participants",
        json={"name": "Fulano da Silva", "role_title": "Motorista", "sector": "Frota"},
    )

    list_resp = await admin_client.get("/v1/training-records")
    assert list_resp.status_code == 200
    item = next(i for i in list_resp.json() if i["id"] == record_id)
    assert item["participant_count"] == 1
    assert item["signed_count"] == 0


@pytest.mark.asyncio
async def test_add_participant_returns_signing_token(
    admin_client: AsyncClient, admin_user: dict
) -> None:
    create_resp = await admin_client.post(
        "/v1/training-records", json=_record_payload(admin_user["id"])
    )
    record_id = create_resp.json()["id"]

    resp = await admin_client.post(
        f"/v1/training-records/{record_id}/participants",
        json={"name": "Fulano da Silva"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["signing_token"]
    assert data["has_signature"] is False
    assert data["signed_at"] is None


@pytest.mark.asyncio
async def test_public_signing_flow(
    admin_client: AsyncClient, client: AsyncClient, admin_user: dict
) -> None:
    """No auth needed for the public token-scoped signing endpoints."""
    create_resp = await admin_client.post(
        "/v1/training-records", json=_record_payload(admin_user["id"])
    )
    record_id = create_resp.json()["id"]
    participant_resp = await admin_client.post(
        f"/v1/training-records/{record_id}/participants",
        json={"name": "Fulano da Silva", "role_title": "Motorista", "sector": "Frota"},
    )
    token = participant_resp.json()["signing_token"]

    summary_resp = await client.get(f"/v1/public/training-sign/{token}")
    assert summary_resp.status_code == 200
    summary = summary_resp.json()
    assert summary["training_name"] == "Treinamento Checklist Suite"
    assert summary["participant_name"] == "Fulano da Silva"
    assert summary["already_signed"] is False

    sign_resp = await client.post(
        f"/v1/public/training-sign/{token}",
        json={
            "name": "Fulano da Silva",
            "role_title": "Motorista",
            "sector": "Frota",
            "confirmed_understanding": True,
            "signature_data": TINY_PNG,
        },
    )
    assert sign_resp.status_code == 204

    summary_resp2 = await client.get(f"/v1/public/training-sign/{token}")
    assert summary_resp2.json()["already_signed"] is True

    record_resp = await admin_client.get(f"/v1/training-records/{record_id}")
    participant = record_resp.json()["participants"][0]
    assert participant["has_signature"] is True
    assert participant["signed_at"] is not None


@pytest.mark.asyncio
async def test_public_sign_requires_confirmation(
    admin_client: AsyncClient, client: AsyncClient, admin_user: dict
) -> None:
    create_resp = await admin_client.post(
        "/v1/training-records", json=_record_payload(admin_user["id"])
    )
    record_id = create_resp.json()["id"]
    participant_resp = await admin_client.post(
        f"/v1/training-records/{record_id}/participants", json={"name": "Fulano"}
    )
    token = participant_resp.json()["signing_token"]

    resp = await client.post(
        f"/v1/public/training-sign/{token}",
        json={
            "name": "Fulano",
            "confirmed_understanding": False,
            "signature_data": TINY_PNG,
        },
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_public_sign_rejects_double_signing(
    admin_client: AsyncClient, client: AsyncClient, admin_user: dict
) -> None:
    create_resp = await admin_client.post(
        "/v1/training-records", json=_record_payload(admin_user["id"])
    )
    record_id = create_resp.json()["id"]
    participant_resp = await admin_client.post(
        f"/v1/training-records/{record_id}/participants", json={"name": "Fulano"}
    )
    token = participant_resp.json()["signing_token"]
    body = {
        "name": "Fulano",
        "confirmed_understanding": True,
        "signature_data": TINY_PNG,
    }
    first = await client.post(f"/v1/public/training-sign/{token}", json=body)
    assert first.status_code == 204
    second = await client.post(f"/v1/public/training-sign/{token}", json=body)
    assert second.status_code == 409


@pytest.mark.asyncio
async def test_public_sign_unknown_token_404(client: AsyncClient) -> None:
    resp = await client.get("/v1/public/training-sign/does-not-exist")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_instructor_and_responsible_signoff_complete_record(
    admin_client: AsyncClient, client: AsyncClient, admin_user: dict
) -> None:
    create_resp = await admin_client.post(
        "/v1/training-records", json=_record_payload(admin_user["id"])
    )
    record_id = create_resp.json()["id"]
    participant_resp = await admin_client.post(
        f"/v1/training-records/{record_id}/participants", json={"name": "Fulano"}
    )
    token = participant_resp.json()["signing_token"]

    await client.post(
        f"/v1/public/training-sign/{token}",
        json={
            "name": "Fulano",
            "confirmed_understanding": True,
            "signature_data": TINY_PNG,
        },
    )

    instr_resp = await admin_client.post(
        f"/v1/training-records/{record_id}/sign-instructor",
        json={"signature_data": TINY_PNG},
    )
    assert instr_resp.status_code == 200
    assert instr_resp.json()["status"] == "completed"

    resp_resp = await admin_client.post(
        f"/v1/training-records/{record_id}/sign-responsible",
        json={"responsible_name": "Gestor Fulano", "signature_data": TINY_PNG},
    )
    assert resp_resp.status_code == 200
    assert resp_resp.json()["responsible_name"] == "Gestor Fulano"


@pytest.mark.asyncio
async def test_pdf_endpoint_returns_pdf(admin_client: AsyncClient, admin_user: dict) -> None:
    create_resp = await admin_client.post(
        "/v1/training-records", json=_record_payload(admin_user["id"])
    )
    record_id = create_resp.json()["id"]

    resp = await admin_client.get(f"/v1/training-records/{record_id}/pdf")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert resp.content[:4] == b"%PDF"


@pytest.mark.asyncio
async def test_remove_participant(admin_client: AsyncClient, admin_user: dict) -> None:
    create_resp = await admin_client.post(
        "/v1/training-records", json=_record_payload(admin_user["id"])
    )
    record_id = create_resp.json()["id"]
    participant_resp = await admin_client.post(
        f"/v1/training-records/{record_id}/participants", json={"name": "Fulano"}
    )
    participant_id = participant_resp.json()["id"]

    del_resp = await admin_client.delete(
        f"/v1/training-records/{record_id}/participants/{participant_id}"
    )
    assert del_resp.status_code == 204

    get_resp = await admin_client.get(f"/v1/training-records/{record_id}")
    assert get_resp.json()["participants"] == []


@pytest.mark.asyncio
async def test_delete_training_record(admin_client: AsyncClient, admin_user: dict) -> None:
    create_resp = await admin_client.post(
        "/v1/training-records", json=_record_payload(admin_user["id"])
    )
    record_id = create_resp.json()["id"]

    del_resp = await admin_client.delete(f"/v1/training-records/{record_id}")
    assert del_resp.status_code == 204

    get_resp = await admin_client.get(f"/v1/training-records/{record_id}")
    assert get_resp.status_code == 404
