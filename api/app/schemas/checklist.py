from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class ChecklistItemResponse(BaseModel):
    id: int
    text: str
    is_done: bool
    position: int
    created_by: int | None = None
    done_by: int | None = None
    done_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChecklistProgress(BaseModel):
    done: int
    total: int


class CreateChecklistItemRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)


class UpdateChecklistItemRequest(BaseModel):
    text: str | None = Field(None, min_length=1, max_length=500)
    is_done: bool | None = None
