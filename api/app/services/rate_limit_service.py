from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.source import Source
from app.models.source_rate_window import SourceRateWindow

_WINDOW = timedelta(minutes=1)
# Windows older than this are deleted when a source opens a new one.
_WINDOW_RETENTION = timedelta(minutes=10)


def utcnow() -> datetime:
    return datetime.now(UTC)


@dataclass(frozen=True)
class RateLimitDecision:
    allowed: bool
    limit: int
    retry_after_seconds: int


class RateLimitService:
    """Per-source fixed-window rate limit for /v1/ingest/*, counted in Postgres
    (one upsert per request — no Redis, see ADR-013)."""

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    @staticmethod
    def limit_for(source: Source) -> int:
        if source.rate_limit_per_minute is not None:
            return source.rate_limit_per_minute
        return settings.ingest_rate_limit_per_minute

    async def hit(self, source: Source, now: datetime | None = None) -> RateLimitDecision:
        limit = self.limit_for(source)
        if limit <= 0:
            return RateLimitDecision(allowed=True, limit=limit, retry_after_seconds=0)

        now = now or utcnow()
        window_start = now.replace(second=0, microsecond=0)
        stmt = (
            insert(SourceRateWindow)
            .values(source_id=source.id, window_start=window_start, request_count=1)
            .on_conflict_do_update(
                index_elements=[SourceRateWindow.source_id, SourceRateWindow.window_start],
                set_={"request_count": SourceRateWindow.request_count + 1},
            )
            .returning(SourceRateWindow.request_count)
        )
        count = (await self._db.execute(stmt)).scalar_one()
        if count == 1:
            await self._db.execute(
                delete(SourceRateWindow).where(
                    SourceRateWindow.source_id == source.id,
                    SourceRateWindow.window_start < window_start - _WINDOW_RETENTION,
                )
            )
        await self._db.commit()

        retry_after = max(1, int((window_start + _WINDOW - now).total_seconds()))
        return RateLimitDecision(
            allowed=count <= limit, limit=limit, retry_after_seconds=retry_after
        )
