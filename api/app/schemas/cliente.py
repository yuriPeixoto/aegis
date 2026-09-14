from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class ClienteModuloResponse(BaseModel):
    modulo_id: int
    nome: str
    ativo: bool
    ativado_em: datetime

    model_config = {"from_attributes": True}


class ClienteResponse(BaseModel):
    id: int
    nome: str
    ativo: bool
    source_id: int | None = None
    source_name: str | None = None
    modulos: list[ClienteModuloResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class ClienteCreate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=255)
    source_id: int | None = None


class ClienteUpdate(BaseModel):
    nome: str | None = Field(None, min_length=2, max_length=255)
    ativo: bool | None = None
    source_id: int | None = None


class ClienteModulosUpdate(BaseModel):
    """Substitui o conjunto de módulos ativos do cliente pelos IDs enviados."""

    modulo_ids: list[int]
