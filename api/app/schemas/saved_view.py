from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class SavedViewCreate(BaseModel):
    name: str
    icon: str = "📋"
    is_shared: bool = False
    filters: dict[str, Any] = {}
    position: int = 0


class SavedViewUpdate(BaseModel):
    name: str | None = None
    icon: str | None = None
    is_shared: bool | None = None
    filters: dict[str, Any] | None = None
    position: int | None = None


class SavedViewResponse(BaseModel):
    id: int
    name: str
    icon: str
    user_id: int | None
    is_shared: bool
    filters: dict[str, Any]
    position: int
    created_at: datetime

    model_config = {"from_attributes": True}
