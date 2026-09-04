from __future__ import annotations

from datetime import date

from app.schemas.calendar_event import RecurrenceRule
from app.services.recurrence import expand_recurrence


def test_daily_recurrence_respects_interval_and_until() -> None:
    dates = expand_recurrence(
        date(2026, 9, 1), RecurrenceRule(freq="daily", interval=2, until=date(2026, 9, 9))
    )
    assert dates == [
        date(2026, 9, 1), date(2026, 9, 3), date(2026, 9, 5), date(2026, 9, 7), date(2026, 9, 9),
    ]


def test_weekly_recurrence_multiple_weekdays() -> None:
    # 2026-09-07 é uma segunda-feira
    dates = expand_recurrence(
        date(2026, 9, 7),
        RecurrenceRule(freq="weekly", byweekday=[1, 3], until=date(2026, 9, 20)),
    )
    assert dates == [date(2026, 9, 7), date(2026, 9, 9), date(2026, 9, 14), date(2026, 9, 16)]


def test_weekly_recurrence_defaults_to_start_weekday() -> None:
    dates = expand_recurrence(
        date(2026, 9, 7), RecurrenceRule(freq="weekly", until=date(2026, 9, 21))
    )
    assert dates == [date(2026, 9, 7), date(2026, 9, 14), date(2026, 9, 21)]


def test_monthly_recurrence_clamps_short_months() -> None:
    dates = expand_recurrence(
        date(2026, 1, 31), RecurrenceRule(freq="monthly", until=date(2026, 4, 1))
    )
    assert dates == [date(2026, 1, 31), date(2026, 2, 28), date(2026, 3, 31)]


def test_recurrence_without_until_stops_at_safety_cap() -> None:
    dates = expand_recurrence(date(2026, 1, 1), RecurrenceRule(freq="daily"))
    assert len(dates) == 104


def test_weekly_start_date_before_its_own_weekday_window_is_included() -> None:
    # start numa terça (2), mas byweekday pede domingo(0) e terça(2) — a
    # primeira ocorrência não pode ser antes do start
    dates = expand_recurrence(
        date(2026, 9, 8), RecurrenceRule(freq="weekly", byweekday=[0, 2], until=date(2026, 9, 15))
    )
    assert dates == [date(2026, 9, 8), date(2026, 9, 13), date(2026, 9, 15)]
