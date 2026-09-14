from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.core.auth import AdminUser, CurrentUser
from app.core.dependencies import DbSession
from app.schemas.modulo import ModuloCreate, ModuloResponse, ModuloUpdate
from app.services.modulo_service import ModuloService

router = APIRouter(prefix="/v1/modulos", tags=["modulos"])


@router.get("", response_model=list[ModuloResponse])
async def list_modulos(db: DbSession, _: CurrentUser) -> list[ModuloResponse]:
    rows = await ModuloService(db).list_all()
    return [
        ModuloResponse.model_validate(modulo, from_attributes=True).model_copy(
            update={"clientes_count": count}
        )
        for modulo, count in rows
    ]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=ModuloResponse)
async def create_modulo(data: ModuloCreate, db: DbSession, _: AdminUser) -> ModuloResponse:
    modulo = await ModuloService(db).create(data)
    return ModuloResponse.model_validate(modulo, from_attributes=True)


@router.patch("/{modulo_id}", response_model=ModuloResponse)
async def update_modulo(
    modulo_id: int, data: ModuloUpdate, db: DbSession, _: AdminUser
) -> ModuloResponse:
    modulo = await ModuloService(db).update(modulo_id, data)
    if modulo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Modulo not found")
    return ModuloResponse.model_validate(modulo, from_attributes=True)
