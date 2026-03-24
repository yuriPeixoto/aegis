from __future__ import annotations

from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from app.models.business_hours import BusinessHoursConfig


class BusinessHoursService:
    """
    Computes SLA deadlines based on configured business hours.

    The algorithm advances a local datetime by the requested number of
    business hours, skipping non-work days, before/after-hours periods,
    and the lunch break.
    """

    def add_business_hours(
        self,
        start: datetime,  # any tz-aware datetime (typically UTC)
        hours: float,
        config: BusinessHoursConfig,
        holidays: list[date] | None = None,
    ) -> datetime:
        """Return the UTC deadline that is `hours` business hours after `start`."""
        tz = ZoneInfo(config.timezone)
        local_start = start.astimezone(tz)
        local_end = self._add_hours_local(local_start, hours, config, holidays)
        return local_end.astimezone(ZoneInfo("UTC"))

    # ── private helpers ───────────────────────────────────────────────────────

    def _add_hours_local(
        self,
        current: datetime,
        hours: float,
        config: BusinessHoursConfig,
        holidays: list[date] | None = None,
    ) -> datetime:
        remaining = hours * 3600  # work in seconds for precision
        work_days = set(config.work_days)  # e.g. {1,2,3,4,5}
        holiday_set = set(holidays or [])

        # Advance to the first valid work moment
        current = self._snap_to_work(current, work_days, config, holiday_set)

        while remaining > 0:
            # Guard: should never be outside work after snap, but be safe
            if current.isoweekday() not in work_days or current.date() in holiday_set or current.time() >= config.work_end:
                current = self._next_work_day(current, work_days, config, holiday_set)
                continue

            # Skip lunch if landed exactly on it
            if (
                config.lunch_start
                and config.lunch_end
                and config.lunch_start <= current.time() < config.lunch_end
            ):
                current = current.replace(
                    hour=config.lunch_end.hour,
                    minute=config.lunch_end.minute,
                    second=0,
                    microsecond=0,
                )

            # Compute next boundary: lunch start (if before it) or end of day
            if (
                config.lunch_start
                and config.lunch_end
                and current.time() < config.lunch_start
            ):
                boundary = current.replace(
                    hour=config.lunch_start.hour,
                    minute=config.lunch_start.minute,
                    second=0,
                    microsecond=0,
                )
            else:
                boundary = current.replace(
                    hour=config.work_end.hour,
                    minute=config.work_end.minute,
                    second=0,
                    microsecond=0,
                )

            available = (boundary - current).total_seconds()

            if remaining <= available:
                current = current + timedelta(seconds=remaining)
                remaining = 0
            else:
                remaining -= available
                current = boundary
                # If we hit lunch, skip it; if end-of-day, go to next day
                if (
                    config.lunch_start
                    and config.lunch_end
                    and current.time() == config.lunch_start
                ):
                    current = current.replace(
                        hour=config.lunch_end.hour,
                        minute=config.lunch_end.minute,
                        second=0,
                        microsecond=0,
                    )
                else:
                    current = self._next_work_day(current, work_days, config, holiday_set)

        return current

    def _snap_to_work(
        self,
        dt: datetime,
        work_days: set[int],
        config: BusinessHoursConfig,
        holiday_set: set[date],
    ) -> datetime:
        """
        If dt is outside work hours, advance it to the next valid moment.
        - Not a work day → next work day at work_start
        - Before work_start → set to work_start today
        - >= work_end → next work day at work_start
        - In lunch → set to lunch_end
        """
        if dt.isoweekday() not in work_days or dt.date() in holiday_set:
            return self._next_work_day(dt, work_days, config, holiday_set)
        if dt.time() < config.work_start:
            return dt.replace(
                hour=config.work_start.hour,
                minute=config.work_start.minute,
                second=0,
                microsecond=0,
            )
        if dt.time() >= config.work_end:
            return self._next_work_day(dt, work_days, config, holiday_set)
        if (
            config.lunch_start
            and config.lunch_end
            and config.lunch_start <= dt.time() < config.lunch_end
        ):
            return dt.replace(
                hour=config.lunch_end.hour,
                minute=config.lunch_end.minute,
                second=0,
                microsecond=0,
            )
        return dt

    def _next_work_day(
        self,
        dt: datetime,
        work_days: set[int],
        config: BusinessHoursConfig,
        holiday_set: set[date],
    ) -> datetime:
        dt = dt + timedelta(days=1)
        dt = dt.replace(
            hour=config.work_start.hour,
            minute=config.work_start.minute,
            second=0,
            microsecond=0,
        )
        while dt.isoweekday() not in work_days or dt.date() in holiday_set:
            dt = dt + timedelta(days=1)
        return dt
