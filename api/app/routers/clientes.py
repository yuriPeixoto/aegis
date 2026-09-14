from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.core.auth import AdminUser, CurrentUser
from app.core.dependencies import DbSession
from app.models.cliente import Cliente
from app.models.cliente_modulo import ClienteModulo
from app.models.modulo import Modulo
from app.schemas.cliente import (
    ClienteCreate,
    ClienteModuloResponse,
    ClienteModulosUpdate,
    ClienteResponse,
    ClienteUpdate,
)
from app.services.cliente_service import ClienteService

router = APIRouter(prefix="/v1/clientes", tags=["clientes"])


def _response(cliente: Cliente, modulos: list[tuple[ClienteModulo, Modulo]]) -> ClienteResponse:
    return ClienteResponse(
        id=cliente.id,
        nome=cliente.nome,
        ativo=cliente.ativo,
        source_id=cliente.source_id,
        source_name=cliente.source.name if cliente.source else None,
        created_at=cliente.created_at,
        modulos=[
            ClienteModuloResponse(
                modulo_id=modulo.id, nome=modulo.nome, ativo=cm.ativo, ativado_em=cm.ativado_em
            )
            for cm, modulo in modulos
        ],
    )


@router.get("", response_model=list[ClienteResponse])
async def list_clientes(db: DbSession, _: CurrentUser) -> list[ClienteResponse]:
    service = ClienteService(db)
    clientes = await service.list_all()
    modulos_map = await service.modulos_ativos_por_cliente([c.id for c in clientes])
    return [_response(c, modulos_map.get(c.id, [])) for c in clientes]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=ClienteResponse)
async def create_cliente(data: ClienteCreate, db: DbSession, _: AdminUser) -> ClienteResponse:
    cliente = await ClienteService(db).create(data)
    return _response(cliente, [])


@router.patch("/{cliente_id}", response_model=ClienteResponse)
async def update_cliente(
    cliente_id: int, data: ClienteUpdate, db: DbSession, _: AdminUser
) -> ClienteResponse:
    service = ClienteService(db)
    cliente = await service.update(cliente_id, data)
    if cliente is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente not found")
    modulos_map = await service.modulos_ativos_por_cliente([cliente_id])
    return _response(cliente, modulos_map.get(cliente_id, []))


@router.put("/{cliente_id}/modulos", response_model=ClienteResponse)
async def set_cliente_modulos(
    cliente_id: int, data: ClienteModulosUpdate, db: DbSession, _: AdminUser
) -> ClienteResponse:
    service = ClienteService(db)
    cliente = await service.get_by_id(cliente_id)
    if cliente is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente not found")
    await service.set_modulos(cliente_id, data.modulo_ids)
    modulos_map = await service.modulos_ativos_por_cliente([cliente_id])
    return _response(cliente, modulos_map.get(cliente_id, []))
