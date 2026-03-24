from __future__ import annotations

from datetime import date
from sqlalchemy import Date, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SlaHoliday(Base):
    """Specific dates to be excluded from business hours calculations."""

    __tablename__ = "sla_holidays"

    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, unique=True, index=True)
    description: Mapped[str] = mapped_column(String(200), nullable=False)
