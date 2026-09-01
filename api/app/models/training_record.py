from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Date, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.calendar_event import CalendarEvent
    from app.models.source import Source
    from app.models.training_participant import TrainingParticipant
    from app.models.user import User

MODALITY_PRESENCIAL = "presencial"
MODALITY_REMOTO = "remoto"

TRAINING_TYPE_INICIAL = "inicial"
TRAINING_TYPE_RECICLAGEM = "reciclagem"
TRAINING_TYPE_ATUALIZACAO = "atualizacao"
TRAINING_TYPE_NOVA_FUNCIONALIDADE = "nova_funcionalidade"

STATUS_DRAFT = "draft"
STATUS_COMPLETED = "completed"


class TrainingRecord(Base):
    __tablename__ = "training_records"

    id: Mapped[int] = mapped_column(primary_key=True)

    calendar_event_id: Mapped[int | None] = mapped_column(
        ForeignKey("calendar_events.id", ondelete="SET NULL"), nullable=True
    )
    source_id: Mapped[int | None] = mapped_column(
        ForeignKey("sources.id", ondelete="SET NULL"), nullable=True
    )

    # Identificação
    training_name: Mapped[str] = mapped_column(String(255), nullable=False)
    system_module: Mapped[str] = mapped_column(String(255), nullable=False)
    version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    training_date: Mapped[date] = mapped_column(Date, nullable=False)
    start_time: Mapped[str | None] = mapped_column(String(5), nullable=True)  # "HH:MM"
    end_time: Mapped[str | None] = mapped_column(String(5), nullable=True)
    workload_hours: Mapped[str | None] = mapped_column(String(20), nullable=True)
    modality: Mapped[str] = mapped_column(String(20), nullable=False)  # presencial | remoto
    training_type: Mapped[str] = mapped_column(String(30), nullable=False)
    area_sector: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Instrutor
    instructor_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    instructor_title: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Módulos/assuntos abordados — [{ "module": str, "subjects": str }, ...]
    modules_json: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False, default=list)

    # Avaliação
    evaluation_method: Mapped[str | None] = mapped_column(String(255), nullable=True)
    performance_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    general_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(String(20), nullable=False, default=STATUS_DRAFT)

    # Validação final
    instructor_signature_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    instructor_signed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    responsible_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    responsible_signature_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    responsible_signed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    calendar_event: Mapped[CalendarEvent | None] = relationship(
        "CalendarEvent", foreign_keys=[calendar_event_id], lazy="selectin"
    )
    source: Mapped[Source | None] = relationship(
        "Source", foreign_keys=[source_id], lazy="selectin"
    )
    instructor: Mapped[User] = relationship(
        "User", foreign_keys=[instructor_user_id], lazy="selectin"
    )
    participants: Mapped[list[TrainingParticipant]] = relationship(
        "TrainingParticipant",
        back_populates="training_record",
        cascade="all, delete-orphan",
        order_by="TrainingParticipant.created_at",
        lazy="selectin",
    )

    @property
    def modules(self) -> list[dict[str, Any]]:
        """Alias so TrainingRecordResponse.model_validate(record, from_attributes=True)
        finds a `modules` attribute — the column itself is named `modules_json`."""
        return self.modules_json
