from __future__ import annotations

from datetime import date, time

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select

from app.core.auth import AdminUser
from app.core.dependencies import DbSession
from app.models.business_hours import BusinessHoursConfig
from app.models.holiday import SlaHoliday
from app.models.sla_policy import SlaPolicy

router = APIRouter(prefix="/v1/settings", tags=["settings"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class BusinessHoursOut(BaseModel):
    work_days: list[int]
    work_start: str
    work_end: str
    lunch_start: str | None
    lunch_end: str | None
    timezone: str


class BusinessHoursUpdate(BaseModel):
    work_days: list[int] | None = None
    work_start: str | None = None   # "HH:MM"
    work_end: str | None = None
    lunch_start: str | None = None
    lunch_end: str | None = None
    timezone: str | None = None


class SlaPolicyOut(BaseModel):
    priority: str
    resolution_hours: int


class SlaPolicyUpdate(BaseModel):
    resolution_hours: int


class HolidayOut(BaseModel):
    id: int
    date: date
    description: str


class HolidayCreate(BaseModel):
    date: date
    description: str


class SlaSettingsOut(BaseModel):
    business_hours: BusinessHoursOut
    policies: list[SlaPolicyOut]
    holidays: list[HolidayOut]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _time_str(t: time | None) -> str | None:
    if t is None:
        return None
    return t.strftime("%H:%M")


def _parse_time(value: str) -> time:
    try:
        h, m = value.split(":")
        return time(int(h), int(m))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid time format '{value}' — expected HH:MM",
        )


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/sla", response_model=SlaSettingsOut)
async def get_sla_settings(db: DbSession, _admin: AdminUser) -> SlaSettingsOut:
    bh = (await db.execute(select(BusinessHoursConfig).where(BusinessHoursConfig.id == 1))).scalar_one_or_none()
    if bh is None:
        raise HTTPException(status_code=404, detail="Business hours config not found")

    policies_rows = (await db.execute(
        select(SlaPolicy).order_by(SlaPolicy.id)
    )).scalars().all()

    holidays_rows = (await db.execute(
        select(SlaHoliday).order_by(SlaHoliday.date)
    )).scalars().all()

    return SlaSettingsOut(
        business_hours=BusinessHoursOut(
            work_days=bh.work_days,
            work_start=_time_str(bh.work_start),  # type: ignore[arg-type]
            work_end=_time_str(bh.work_end),  # type: ignore[arg-type]
            lunch_start=_time_str(bh.lunch_start),
            lunch_end=_time_str(bh.lunch_end),
            timezone=bh.timezone,
        ),
        policies=[SlaPolicyOut(priority=p.priority, resolution_hours=p.resolution_hours) for p in policies_rows],
        holidays=[HolidayOut(id=h.id, date=h.date, description=h.description) for h in holidays_rows],
    )


@router.patch("/sla/business-hours", response_model=BusinessHoursOut)
async def update_business_hours(
    body: BusinessHoursUpdate,
    db: DbSession,
    _admin: AdminUser,
) -> BusinessHoursOut:
    bh = (await db.execute(select(BusinessHoursConfig).where(BusinessHoursConfig.id == 1))).scalar_one_or_none()
    if bh is None:
        raise HTTPException(status_code=404, detail="Business hours config not found")

    if body.work_days is not None:
        bh.work_days = body.work_days
    if body.work_start is not None:
        bh.work_start = _parse_time(body.work_start)
    if body.work_end is not None:
        bh.work_end = _parse_time(body.work_end)
    if body.lunch_start is not None:
        bh.lunch_start = _parse_time(body.lunch_start) if body.lunch_start else None
    if body.lunch_end is not None:
        bh.lunch_end = _parse_time(body.lunch_end) if body.lunch_end else None
    if body.timezone is not None:
        bh.timezone = body.timezone

    await db.commit()
    await db.refresh(bh)

    return BusinessHoursOut(
        work_days=bh.work_days,
        work_start=_time_str(bh.work_start),  # type: ignore[arg-type]
        work_end=_time_str(bh.work_end),  # type: ignore[arg-type]
        lunch_start=_time_str(bh.lunch_start),
        lunch_end=_time_str(bh.lunch_end),
        timezone=bh.timezone,
    )


@router.patch("/sla/policies/{priority}", response_model=SlaPolicyOut)
async def update_sla_policy(
    priority: str,
    body: SlaPolicyUpdate,
    db: DbSession,
    _admin: AdminUser,
) -> SlaPolicyOut:
    policy = (await db.execute(
        select(SlaPolicy).where(SlaPolicy.priority == priority.lower())
    )).scalar_one_or_none()

    if policy is None:
        raise HTTPException(status_code=404, detail=f"Policy '{priority}' not found")

    policy.resolution_hours = body.resolution_hours
    await db.commit()
    await db.refresh(policy)

    return SlaPolicyOut(priority=policy.priority, resolution_hours=policy.resolution_hours)


@router.post("/sla/holidays", response_model=HolidayOut, status_code=status.HTTP_201_CREATED)
async def create_holiday(
    body: HolidayCreate,
    db: DbSession,
    _admin: AdminUser,
) -> HolidayOut:
    existing = (await db.execute(
        select(SlaHoliday).where(SlaHoliday.date == body.date)
    )).scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Holiday for date {body.date} already exists"
        )

    holiday = SlaHoliday(date=body.date, description=body.description)
    db.add(holiday)
    await db.commit()
    await db.refresh(holiday)

    return HolidayOut(id=holiday.id, date=holiday.date, description=holiday.description)


@router.delete("/sla/holidays/{holiday_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_holiday(
    holiday_id: int,
    db: DbSession,
    _admin: AdminUser,
) -> None:
    holiday = (await db.execute(
        select(SlaHoliday).where(SlaHoliday.id == holiday_id)
    )).scalar_one_or_none()

    if holiday is None:
        raise HTTPException(status_code=404, detail="Holiday not found")

    await db.delete(holiday)
    await db.commit()
