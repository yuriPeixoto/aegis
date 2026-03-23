from __future__ import annotations

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SlaPolicy(Base):
    """Global SLA resolution targets per ticket priority (in business hours)."""

    __tablename__ = "sla_policies"

    id: Mapped[int] = mapped_column(primary_key=True)
    priority: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    resolution_hours: Mapped[int] = mapped_column(Integer, nullable=False)
