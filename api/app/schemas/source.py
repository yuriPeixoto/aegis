from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field

from app.models.source import SOURCE_KIND_ALERT, SOURCE_KIND_SYSTEM


class SourceKind(StrEnum):
    SYSTEM = SOURCE_KIND_SYSTEM
    ALERT = SOURCE_KIND_ALERT


class SourceCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    slug: str = Field(..., min_length=2, max_length=100, pattern=r"^[a-z0-9-]+$")
    kind: SourceKind = SourceKind.SYSTEM


class SourceResponse(BaseModel):
    id: int
    name: str
    slug: str
    is_active: bool
    logo: str | None = None
    webhook_url: str | None = None
    webhook_url_internal: str | None = None
    csat_enabled: bool = False
    csat_sampling_pct: int = 100
    kind: SourceKind = SourceKind.SYSTEM
    alert_tag_id: int | None = None
    alert_recipient_user_id: int | None = None
    rate_limit_per_minute: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SourceCreatedResponse(SourceResponse):
    """Returned only once at creation — includes the plaintext API key and webhook secret."""

    api_key: str
    webhook_secret: str


class SourceUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=255)
    is_active: bool | None = None
    webhook_url: str | None = Field(None, max_length=500)
    webhook_url_internal: str | None = Field(None, max_length=500)
    csat_enabled: bool | None = None
    csat_sampling_pct: int | None = Field(None, ge=1, le=100)
    kind: SourceKind | None = None
    # The three below accept an explicit null to clear the value.
    alert_tag_id: int | None = None
    alert_recipient_user_id: int | None = None
    rate_limit_per_minute: int | None = Field(None, ge=1, le=100_000)


class SourceKeyRegeneratedResponse(BaseModel):
    api_key: str
    webhook_secret: str
