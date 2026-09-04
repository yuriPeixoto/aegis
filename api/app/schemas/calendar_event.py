from __future__ import annotations

import re
from datetime import date, datetime

from pydantic import BaseModel, field_validator, model_validator

EVENT_TYPES = {"on_call", "training", "deployment", "task"}
_TIME_RE = re.compile(r"^\d{2}:\d{2}$")
_COLOR_RE = re.compile(r"^#[0-9a-fA-F]{6}$")


class CalendarEventCreate(BaseModel):
    type: str
    title: str | None = None
    agent_id: int
    event_date: date
    start_time: str | None = None
    end_time: str | None = None
    source_id: int | None = None
    ticket_id: int | None = None
    color: str | None = None
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

    @field_validator("color")
    @classmethod
    def validate_color(cls, v: str | None) -> str | None:
        if v is not None and not _COLOR_RE.match(v):
            raise ValueError("color must be a hex string like #RRGGBB")
        return v

    @model_validator(mode="after")
    def training_requires_source(self) -> CalendarEventCreate:
        if self.type == "training" and self.source_id is None:
            raise ValueError("training events require a source_id")
        return self

    @model_validator(mode="after")
    def task_requires_title(self) -> CalendarEventCreate:
        if self.type == "task" and not (self.title and self.title.strip()):
            raise ValueError("task events require a title")
        return self


class CalendarEventUpdate(BaseModel):
    title: str | None = None
    agent_id: int | None = None
    event_date: date | None = None
    start_time: str | None = None
    end_time: str | None = None
    source_id: int | None = None
    ticket_id: int | None = None
    color: str | None = None
    notes: str | None = None

    @field_validator("start_time", "end_time")
    @classmethod
    def validate_time_format(cls, v: str | None) -> str | None:
        if v is not None and not _TIME_RE.match(v):
            raise ValueError("time must be in HH:MM format")
        return v

    @field_validator("color")
    @classmethod
    def validate_color(cls, v: str | None) -> str | None:
        if v is not None and not _COLOR_RE.match(v):
            raise ValueError("color must be a hex string like #RRGGBB")
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


class TagSlim(BaseModel):
    id: int
    name: str
    color: str

    model_config = {"from_attributes": True}


class TicketSlim(BaseModel):
    id: int
    external_id: str
    tags: list[TagSlim]

    model_config = {"from_attributes": True}


class CalendarEventResponse(BaseModel):
    id: int
    type: str
    title: str | None
    agent_id: int
    event_date: date
    start_time: str | None
    end_time: str | None
    source_id: int | None
    ticket_id: int | None
    color: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime
    agent: AgentSlim
    source: SourceSlim | None
    ticket: TicketSlim | None

    model_config = {"from_attributes": True}
