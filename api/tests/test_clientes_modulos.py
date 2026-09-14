from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient


def unique_nome(prefix: str = "Cliente") -> str:
    return f"{prefix} {uuid.uuid4().hex[:8]}"


async def _create_modulo(client: AsyncClient, nome: str | None = None) -> dict:
    response = await client.post("/v1/modulos", json={"nome": nome or unique_nome("Modulo")})
    assert response.status_code == 201
    return response.json()


async def _create_cliente(client: AsyncClient, **kwargs) -> dict:
    payload = {"nome": unique_nome(), **kwargs}
    response = await client.post("/v1/clientes", json=payload)
    assert response.status_code == 201
    return response.json()


@pytest.mark.asyncio
async def test_create_cliente_sem_source(admin_client: AsyncClient) -> None:
    data = await _create_cliente(admin_client)
    assert data["ativo"] is True
    assert data["source_id"] is None
    assert data["source_name"] is None
    assert data["modulos"] == []


@pytest.mark.asyncio
async def test_create_cliente_requires_admin(client: AsyncClient) -> None:
    response = await client.post("/v1/clientes", json={"nome": "X"})
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_list_clientes(admin_client: AsyncClient) -> None:
    await _create_cliente(admin_client)
    await _create_cliente(admin_client)
    response = await admin_client.get("/v1/clientes")
    assert response.status_code == 200
    assert len(response.json()) >= 2


@pytest.mark.asyncio
async def test_update_cliente(admin_client: AsyncClient) -> None:
    cliente = await _create_cliente(admin_client)
    response = await admin_client.patch(
        f"/v1/clientes/{cliente['id']}", json={"nome": "Renomeado", "ativo": False}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["nome"] == "Renomeado"
    assert data["ativo"] is False


@pytest.mark.asyncio
async def test_update_cliente_not_found(admin_client: AsyncClient) -> None:
    response = await admin_client.patch("/v1/clientes/999999", json={"nome": "Xx"})
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_create_modulo_requires_admin(client: AsyncClient) -> None:
    response = await client.post("/v1/modulos", json={"nome": "X"})
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_list_modulos_includes_clientes_count(admin_client: AsyncClient) -> None:
    modulo = await _create_modulo(admin_client)
    cliente = await _create_cliente(admin_client)
    await admin_client.put(
        f"/v1/clientes/{cliente['id']}/modulos", json={"modulo_ids": [modulo["id"]]}
    )

    response = await admin_client.get("/v1/modulos")
    assert response.status_code == 200
    match = next(m for m in response.json() if m["id"] == modulo["id"])
    assert match["clientes_count"] == 1


@pytest.mark.asyncio
async def test_set_cliente_modulos_ativa_e_desativa(admin_client: AsyncClient) -> None:
    mod_a = await _create_modulo(admin_client)
    mod_b = await _create_modulo(admin_client)
    cliente = await _create_cliente(admin_client)

    r1 = await admin_client.put(
        f"/v1/clientes/{cliente['id']}/modulos", json={"modulo_ids": [mod_a["id"], mod_b["id"]]}
    )
    assert r1.status_code == 200
    assert {m["modulo_id"] for m in r1.json()["modulos"]} == {mod_a["id"], mod_b["id"]}

    # Desativa mod_b, mantém só mod_a — não deve duplicar a linha ao reenviar mod_a
    r2 = await admin_client.put(
        f"/v1/clientes/{cliente['id']}/modulos", json={"modulo_ids": [mod_a["id"]]}
    )
    assert r2.status_code == 200
    assert [m["modulo_id"] for m in r2.json()["modulos"]] == [mod_a["id"]]

    # Reativa mod_b — deve reaproveitar a linha existente, não criar outra
    r3 = await admin_client.put(
        f"/v1/clientes/{cliente['id']}/modulos", json={"modulo_ids": [mod_a["id"], mod_b["id"]]}
    )
    assert r3.status_code == 200
    assert {m["modulo_id"] for m in r3.json()["modulos"]} == {mod_a["id"], mod_b["id"]}


@pytest.mark.asyncio
async def test_set_cliente_modulos_not_found(admin_client: AsyncClient) -> None:
    response = await admin_client.put("/v1/clientes/999999/modulos", json={"modulo_ids": []})
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_cliente_com_source(admin_client: AsyncClient) -> None:
    slug = unique_nome("fonte").lower().replace(" ", "-")
    src = await admin_client.post("/v1/sources", json={"name": "Fonte Teste", "slug": slug})
    assert src.status_code == 201
    source_id = src.json()["id"]

    cliente = await _create_cliente(admin_client, source_id=source_id)
    assert cliente["source_id"] == source_id
    assert cliente["source_name"] == "Fonte Teste"
