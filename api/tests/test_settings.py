from __future__ import annotations

from datetime import date, time

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.business_hours import BusinessHoursConfig
from app.models.holiday import SlaHoliday


@pytest.fixture
async def business_hours(db_session: AsyncSession) -> BusinessHoursConfig:
    bh = BusinessHoursConfig(
        id=1,
        work_days=[1, 2, 3, 4, 5],
        work_start=time(8, 0),
        work_end=time(17, 40),
        lunch_start=time(11, 30),
        lunch_end=time(12, 30),
        timezone="America/Cuiaba",
    )
    db_session.add(bh)
    await db_session.commit()
    return bh


@pytest.mark.asyncio
async def test_calendar_reference_available_to_any_authenticated_user(
    agent_client: AsyncClient, business_hours: BusinessHoursConfig
) -> None:
    resp = await agent_client.get("/v1/settings/calendar-reference")
    assert resp.status_code == 200
    body = resp.json()
    assert body["business_hours"]["work_days"] == [1, 2, 3, 4, 5]
    assert body["business_hours"]["work_start"] == "08:00"
    assert body["business_hours"]["work_end"] == "17:40"
    assert body["business_hours"]["lunch_start"] == "11:30"
    assert body["business_hours"]["lunch_end"] == "12:30"
    assert body["holidays"] == []
    assert "policies" not in body  # não vaza política de SLA pra fora do admin


@pytest.mark.asyncio
async def test_calendar_reference_requires_auth(
    client: AsyncClient, business_hours: BusinessHoursConfig
) -> None:
    resp = await client.get("/v1/settings/calendar-reference")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_calendar_reference_includes_holidays(
    agent_client: AsyncClient, business_hours: BusinessHoursConfig, db_session: AsyncSession
) -> None:
    db_session.add(SlaHoliday(date=date(2026, 12, 25), description="Natal"))
    await db_session.commit()

    resp = await agent_client.get("/v1/settings/calendar-reference")
    assert resp.status_code == 200
    holidays = resp.json()["holidays"]
    assert len(holidays) == 1
    assert holidays[0]["date"] == "2026-12-25"
    assert holidays[0]["description"] == "Natal"
