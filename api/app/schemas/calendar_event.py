from __future__ import annotations

import re
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

EVENT_TYPES = {"on_call", "training", "deployment", "task"}
_TIME_RE = re.compile(r"^\d{2}:\d{2}$")
_COLOR_RE = re.compile(r"^#[0-9a-fA-F]{6}$")

# Recorrência é uma feature de baixo uso (confirmado com o usuário) — série
# materializada (linhas reais e independentes) com um teto de segurança, em
# vez de expansão virtual em tempo de leitura. Ver #599.
MAX_RECURRENCE_OCCURRENCES = 104  # ~2 anos semanais


class RecurrenceRule(BaseModel):
    freq: Literal["daily", "weekly", "monthly"]
    interval: int = Field(default=1, ge=1, le=52)
    byweekday: list[int] | None = None  # 0=domingo .. 6=sábado, só pra freq=weekly
    until: date | None = None  # inclusive; se ausente, usa o teto de segurança

    @field_validator("byweekday")
    @classmethod
    def validate_byweekday(cls, v: list[int] | None) -> list[int] | None:
        if v is not None and any(d < 0 or d > 6 for d in v):
            raise ValueError("byweekday must contain values between 0 (Sunday) and 6 (Saturday)")
        return v


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
    pr_number: str | None = None
    completed_at: datetime | None = None
    notes: str | None = None
    recurrence: RecurrenceRule | None = None

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

    @model_validator(mode="after")
    def recurrence_only_for_task(self) -> CalendarEventCreate:
        if self.recurrence is not None and self.type != "task":
            raise ValueError("recurrence is only supported for task events")
        return self

    @model_validator(mode="after")
    def byweekday_only_for_weekly(self) -> CalendarEventCreate:
        if self.recurrence and self.recurrence.byweekday and self.recurrence.freq != "weekly":
            raise ValueError("byweekday is only valid for freq=weekly")
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
    pr_number: str | None = None
    completed_at: datetime | None = None
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
    pr_number: str | None
    completed_at: datetime | None
    recurrence_group_id: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime
    agent: AgentSlim
    source: SourceSlim | None
    ticket: TicketSlim | None

    model_config = {"from_attributes": True}
