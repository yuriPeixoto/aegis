from __future__ import annotations

from calendar import monthrange
from datetime import date, timedelta

from app.schemas.calendar_event import MAX_RECURRENCE_OCCURRENCES, RecurrenceRule


def _js_weekday(d: date) -> int:
    """0=domingo .. 6=sábado (convenção usada no picker do frontend)."""
    return (d.weekday() + 1) % 7


def expand_recurrence(start: date, rule: RecurrenceRule) -> list[date]:
    """Materializa as datas de uma série, com teto de segurança.

    Não faz expansão virtual infinita — cada data retornada vira uma linha
    real e independente no banco (ver #599: uso raro, volume baixo).
    """
    dates: list[date] = []

    if rule.freq == "daily":
        d = start
        while len(dates) < MAX_RECURRENCE_OCCURRENCES:
            if rule.until and d > rule.until:
                break
            dates.append(d)
            d += timedelta(days=rule.interval)

    elif rule.freq == "weekly":
        weekdays = sorted(rule.byweekday) if rule.byweekday else [_js_weekday(start)]
        week_start = start - timedelta(days=_js_weekday(start))
        week = 0
        while len(dates) < MAX_RECURRENCE_OCCURRENCES:
            for wd in weekdays:
                d = week_start + timedelta(weeks=week, days=wd)
                if d < start:
                    continue
                if rule.until and d > rule.until:
                    return dates
                dates.append(d)
                if len(dates) >= MAX_RECURRENCE_OCCURRENCES:
                    break
            week += rule.interval

    elif rule.freq == "monthly":
        month_offset = 0
        while len(dates) < MAX_RECURRENCE_OCCURRENCES:
            total_month = start.month - 1 + month_offset
            year = start.year + total_month // 12
            month = total_month % 12 + 1
            day = min(start.day, monthrange(year, month)[1])
            d = date(year, month, day)
            if rule.until and d > rule.until:
                break
            dates.append(d)
            month_offset += rule.interval

    return dates
