from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class ModuloResponse(BaseModel):
    id: int
    nome: str
    ativo: bool
    clientes_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class ModuloCreate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=255)


class ModuloUpdate(BaseModel):
    nome: str | None = Field(None, min_length=2, max_length=255)
    ativo: bool | None = None
