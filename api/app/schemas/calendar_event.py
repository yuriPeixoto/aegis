from __future__ import annotations

import re
from datetime import date, datetime

from pydantic import BaseModel, field_validator, model_validator

EVENT_TYPES = {"on_call", "training"}
_TIME_RE = re.compile(r"^\d{2}:\d{2}$")


class CalendarEventCreate(BaseModel):
    type: str
    agent_id: int
    event_date: date
    start_time: str | None = None
    end_time: str | None = None
    source_id: int | None = None
    notes: str | None = None

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v not in EVENT_TYPES:
            raise ValueError(f"type must be one of {sorted(EVENT_TYPES)}")
        return v

    @field_validator("start_time", "end_time")
    @classmethod
    def validate_time_format(cls, v: str | None) -> str | None:
        if v is not None and not _TIME_RE.match(v):
            raise ValueError("time must be in HH:MM format")
        return v

    @model_validator(mode="after")
    def training_requires_source(self) -> CalendarEventCreate:
        if self.type == "training" and self.source_id is None:
            raise ValueError("training events require a source_id")
        return self


class CalendarEventUpdate(BaseModel):
    agent_id: int | None = None
    event_date: date | None = None
    start_time: str | None = None
    end_time: str | None = None
    source_id: int | None = None
    notes: str | None = None

    @field_validator("start_time", "end_time")
    @classmethod
    def validate_time_format(cls, v: str | None) -> str | None:
        if v is not None and not _TIME_RE.match(v):
            raise ValueError("time must be in HH:MM format")
        return v


class AgentSlim(BaseModel):
    id: int
    name: str
    avatar: str | None = None

    model_config = {"from_attributes": True}


class SourceSlim(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class CalendarEventResponse(BaseModel):
    id: int
    type: str
    agent_id: int
    event_date: date
    start_time: str | None
    end_time: str | None
    source_id: int | None
    notes: str | None
    created_at: datetime
    updated_at: datetime
    agent: AgentSlim
    source: SourceSlim | None

    model_config = {"from_attributes": True}
