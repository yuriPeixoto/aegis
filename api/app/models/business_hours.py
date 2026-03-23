from __future__ import annotations

from datetime import time

from sqlalchemy import Time
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class BusinessHoursConfig(Base):
    """Global business hours configuration (one row, id=1)."""

    __tablename__ = "business_hours_config"

    id: Mapped[int] = mapped_column(primary_key=True)
    # ISO weekdays: 1=Mon … 7=Sun
    work_days: Mapped[list[int]] = mapped_column(ARRAY(Integer), nullable=False)
    work_start: Mapped[time] = mapped_column(Time, nullable=False)
    work_end: Mapped[time] = mapped_column(Time, nullable=False)
    lunch_start: Mapped[time | None] = mapped_column(Time, nullable=True)
    lunch_end: Mapped[time | None] = mapped_column(Time, nullable=True)
    timezone: Mapped[str] = mapped_column(String(50), nullable=False, default="UTC")
