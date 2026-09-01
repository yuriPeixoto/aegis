from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, field_validator

from app.schemas.calendar_event import AgentSlim, SourceSlim

MODALITIES = {"presencial", "remoto"}
TRAINING_TYPES = {"inicial", "reciclagem", "atualizacao", "nova_funcionalidade"}


class TrainingModule(BaseModel):
    module: str
    subjects: str = ""


class TrainingRecordCreate(BaseModel):
    calendar_event_id: int | None = None
    source_id: int | None = None
    training_name: str
    system_module: str
    version: str | None = None
    training_date: date
    start_time: str | None = None
    end_time: str | None = None
    workload_hours: str | None = None
    modality: str
    training_type: str
    area_sector: str | None = None
    instructor_user_id: int
    instructor_title: str | None = None
    modules: list[TrainingModule] = []
    evaluation_method: str | None = None
    performance_notes: str | None = None
    general_notes: str | None = None

    @field_validator("modality")
    @classmethod
    def validate_modality(cls, v: str) -> str:
        if v not in MODALITIES:
            raise ValueError(f"modality must be one of {sorted(MODALITIES)}")
        return v

    @field_validator("training_type")
    @classmethod
    def validate_training_type(cls, v: str) -> str:
        if v not in TRAINING_TYPES:
            raise ValueError(f"training_type must be one of {sorted(TRAINING_TYPES)}")
        return v


class TrainingRecordUpdate(BaseModel):
    training_name: str | None = None
    system_module: str | None = None
    version: str | None = None
    training_date: date | None = None
    start_time: str | None = None
    end_time: str | None = None
    workload_hours: str | None = None
    modality: str | None = None
    training_type: str | None = None
    area_sector: str | None = None
    instructor_user_id: int | None = None
    instructor_title: str | None = None
    modules: list[TrainingModule] | None = None
    evaluation_method: str | None = None
    performance_notes: str | None = None
    general_notes: str | None = None


class ParticipantCreate(BaseModel):
    name: str
    role_title: str | None = None
    sector: str | None = None


class ParticipantResponse(BaseModel):
    id: int
    name: str
    role_title: str | None
    sector: str | None
    signed_at: datetime | None
    confirmed_understanding: bool
    signing_token: str
    token_expires_at: datetime
    has_signature: bool

    model_config = {"from_attributes": True}


class TrainingRecordResponse(BaseModel):
    id: int
    calendar_event_id: int | None
    source: SourceSlim | None
    training_name: str
    system_module: str
    version: str | None
    training_date: date
    start_time: str | None
    end_time: str | None
    workload_hours: str | None
    modality: str
    training_type: str
    area_sector: str | None
    instructor: AgentSlim
    instructor_title: str | None
    modules: list[TrainingModule]
    evaluation_method: str | None
    performance_notes: str | None
    general_notes: str | None
    status: str
    instructor_signed_at: datetime | None
    responsible_name: str | None
    responsible_signed_at: datetime | None
    created_at: datetime
    updated_at: datetime
    participants: list[ParticipantResponse]

    model_config = {"from_attributes": True}


class TrainingRecordListItem(BaseModel):
    id: int
    training_name: str
    training_date: date
    modality: str
    status: str
    source: SourceSlim | None
    instructor: AgentSlim
    participant_count: int
    signed_count: int

    model_config = {"from_attributes": True}


class SignResponsibleRequest(BaseModel):
    responsible_name: str
    signature_data: str  # data:image/png;base64,....


class SignInstructorRequest(BaseModel):
    signature_data: str


# ── Public signing (unauthenticated, token-scoped) ─────────────────────────────


class PublicTrainingSummary(BaseModel):
    training_name: str
    system_module: str
    training_date: date
    start_time: str | None
    end_time: str | None
    workload_hours: str | None
    modality: str
    instructor_name: str
    source_name: str | None
    participant_name: str
    participant_role_title: str | None
    participant_sector: str | None
    already_signed: bool


class PublicSignRequest(BaseModel):
    name: str
    role_title: str | None = None
    sector: str | None = None
    confirmed_understanding: bool
    signature_data: str

    @field_validator("confirmed_understanding")
    @classmethod
    def must_confirm(cls, v: bool) -> bool:
        if not v:
            raise ValueError("confirmed_understanding must be true to sign")
        return v
