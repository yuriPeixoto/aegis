from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Modulo(Base):
    """Catálogo de módulos/serviços da Unitop (Telemetria, Checklist Suite, etc.).
    CRUD admin, não enum — ver ADR-012: a lista cresce (Aegis, Maestro, Cronwatch
    já não estavam na lista original)."""

    __tablename__ = "modulos"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
