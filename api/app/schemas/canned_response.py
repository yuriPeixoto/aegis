from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field


class CannedResponseActions(BaseModel):
    status: str | None = None
    priority: str | None = None
    assigned_to_user_id: int | None = None


class CannedResponseBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    body: str = Field(..., min_length=1)
    actions: CannedResponseActions | None = None


class CannedResponseCreate(CannedResponseBase):
    pass


class CannedResponseUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    body: str | None = Field(None, min_length=1)
    actions: CannedResponseActions | None = None


class CannedResponseResponse(CannedResponseBase):
    id: int
    created_by_id: int | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ApplyCannedResponseRequest(BaseModel):
    ticket_id: int
    canned_response_id: int
