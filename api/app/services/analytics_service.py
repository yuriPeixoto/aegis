from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Literal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.source import Source
from app.models.ticket import Ticket
from app.models.user import User

_TERMINAL = ('pending_closure', 'resolved', 'closed', 'cancelled', 'merged')
_RESOLVED = ('pending_closure', 'resolved', 'closed')

Granularity = Literal['day', 'week', 'month']

_TRUNC: dict[Granularity, str] = {
    'day': 'day',
    'week': 'week',
    'month': 'month',
}


def _active_src_subq():
    return Ticket.source_id.in_(select(Source.id).where(Source.is_active.is_(True)))


def _parse_range(from_date: date | None, to_date: date | None) -> tuple[datetime, datetime]:
    tz = timezone.utc
    start = datetime.combine(
        from_date or (date.today() - timedelta(days=30)), datetime.min.time()
    ).replace(tzinfo=tz)
    end = datetime.combine(to_date or date.today(), datetime.max.time()).replace(tzinfo=tz)
    return start, end


class AnalyticsService:
    """
    Observational analytics service — computes historical metrics from ticket data.

    Extension points for ML (Phase 4.7, 4.8, Phase 7):
    - Every public method returns a `meta` dict that callers can extend with
      ML signals (anomaly flags, predictions) before sending to the client.
    - `get_agent_stats` returns a `features` block: pre-computed per-agent
      feature vectors (avg resolution by type/priority) for CSAT prediction
      (7.4) and workload balancing (7.5).
    - `get_overview` returns `volume_trend` and `resolution_trend` as time-series
      with configurable granularity — the shape the anomaly detector (4.7) needs.
    - A future `get_sla_breach_features(ticket_id)` method can be added here
      to feed the breach predictor (4.8) without touching the router layer.
    """

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    # ── Agent analytics ──────────────────────────────────────────────────────

    async def get_agent_stats(
        self,
        user_id: int,
        from_date: date | None = None,
        to_date: date | None = None,
        granularity: Granularity = 'day',
    ) -> dict | None:
        start, end = _parse_range(from_date, to_date)
        now = datetime.now(timezone.utc)
        _src = _active_src_subq()
        trunc = _TRUNC[granularity]

        r = await self._db.execute(select(User).where(User.id == user_id))
        agent = r.scalar_one_or_none()
        if agent is None:
            return None

        # ── KPIs ─────────────────────────────────────────────────────────────

        r = await self._db.execute(
            select(func.count()).where(
                _src,
                Ticket.assigned_to_user_id == user_id,
                Ticket.first_ingested_at.between(start, end),
            )
        )
        total_period: int = r.scalar_one()

        # Tickets do período que ainda estão ativos
        r = await self._db.execute(
            select(func.count()).where(
                _src,
                Ticket.assigned_to_user_id == user_id,
                Ticket.first_ingested_at.between(start, end),
                ~Ticket.status.in_(_TERMINAL),
            )
        )
        currently_open: int = r.scalar_one()

        # Tickets do período em status terminal (resolved + closed + cancelled + pending_closure)
        # Garante: total_period == currently_open + resolved_period
        r = await self._db.execute(
            select(func.count()).where(
                _src,
                Ticket.assigned_to_user_id == user_id,
                Ticket.first_ingested_at.between(start, end),
                Ticket.status.in_(_TERMINAL),
            )
        )
        resolved_period: int = r.scalar_one()

        r = await self._db.execute(
            select(
                func.avg(
                    func.extract(
                        'epoch',
                        func.coalesce(Ticket.resolved_at, Ticket.last_synced_at)
                        - Ticket.first_ingested_at,
                    ) / 3600
                )
            ).where(
                _src,
                Ticket.assigned_to_user_id == user_id,
                Ticket.status.in_(_RESOLVED),
                func.coalesce(Ticket.resolved_at, Ticket.last_synced_at).between(start, end),
            )
        )
        mttr_raw = r.scalar_one()
        mttr_hours: float | None = round(float(mttr_raw), 1) if mttr_raw is not None else None

        r = await self._db.execute(
            select(func.count()).where(
                _src,
                Ticket.assigned_to_user_id == user_id,
                Ticket.sla_due_at.is_not(None),
                Ticket.first_ingested_at.between(start, end),
            )
        )
        sla_total: int = r.scalar_one()

        r = await self._db.execute(
            select(func.count()).where(
                _src,
                Ticket.assigned_to_user_id == user_id,
                Ticket.sla_due_at.is_not(None),
                Ticket.sla_due_at < now,
                Ticket.sla_paused_since.is_(None),
                ~Ticket.status.in_(_TERMINAL),
                Ticket.first_ingested_at.between(start, end),
            )
        )
        sla_overdue: int = r.scalar_one()
        sla_rate: float | None = (
            round((sla_total - sla_overdue) / sla_total * 100, 1) if sla_total > 0 else None
        )

        r = await self._db.execute(
            select(func.avg(Ticket.csat_rating)).where(
                _src,
                Ticket.assigned_to_user_id == user_id,
                Ticket.csat_rating.is_not(None),
                Ticket.csat_submitted_at.between(start, end),
            )
        )
        csat_raw = r.scalar_one()
        avg_csat: float | None = round(float(csat_raw), 2) if csat_raw is not None else None

        # ── Volume trend ──────────────────────────────────────────────────────

        r = await self._db.execute(
            select(
                func.date_trunc(trunc, Ticket.first_ingested_at).label('bucket'),
                func.count().label('opened'),
            )
            .where(
                _src,
                Ticket.assigned_to_user_id == user_id,
                Ticket.first_ingested_at.between(start, end),
            )
            .group_by('bucket')
            .order_by('bucket')
        )
        volume_trend = [
            {'date': row.bucket.date().isoformat(), 'opened': row.opened}
            for row in r
        ]

        # ── Breakdown by priority and type ────────────────────────────────────

        r = await self._db.execute(
            select(Ticket.priority, func.count().label('cnt'))
            .where(
                _src,
                Ticket.assigned_to_user_id == user_id,
                Ticket.first_ingested_at.between(start, end),
            )
            .group_by(Ticket.priority)
        )
        by_priority = [{'priority': row.priority or 'unknown', 'count': row.cnt} for row in r]

        r = await self._db.execute(
            select(Ticket.type, func.count().label('cnt'))
            .where(
                _src,
                Ticket.assigned_to_user_id == user_id,
                Ticket.first_ingested_at.between(start, end),
            )
            .group_by(Ticket.type)
        )
        by_type = [{'type': row.type or 'unknown', 'count': row.cnt} for row in r]

        # ── ML feature vectors (Phase 7.4 CSAT predictor, 7.5 workload balancer)
        # Pre-computed per-agent feature vectors. These are already available from
        # the queries above; we just reshape them into a stable keyed structure
        # so the prediction layer can consume them without extra queries.
        features = {
            'avg_mttr_hours': mttr_hours,
            'sla_adherence_rate': sla_rate,
            'avg_csat': avg_csat,
            'resolution_count_period': resolved_period,
            'currently_open': currently_open,
            # Granular MTTR and volume by type/priority will be added here
            # when Phase 7 models are trained — same data, different aggregation.
        }

        return {
            'user_id': agent.id,
            'name': agent.name,
            'avatar': agent.avatar,
            'role': agent.role,
            'is_senior': agent.is_senior,
            'created_at': agent.created_at.isoformat(),
            'period': {'from': start.date().isoformat(), 'to': end.date().isoformat()},
            'granularity': granularity,
            'kpis': {
                'total_period': total_period,
                'currently_open': currently_open,
                'resolved_period': resolved_period,
                'mttr_hours': mttr_hours,
                'sla_rate': sla_rate,
                'avg_csat': avg_csat,
            },
            'volume_trend': volume_trend,
            'by_priority': by_priority,
            'by_type': by_type,
            # ML extension point: Phase 4.7/4.8/7.x inject signals here
            # without breaking existing consumers.
            'features': features,
            'meta': {},
        }

    # ── Overview analytics ───────────────────────────────────────────────────

    async def get_overview(
        self,
        from_date: date | None = None,
        to_date: date | None = None,
        granularity: Granularity = 'day',
    ) -> dict:
        start, end = _parse_range(from_date, to_date)
        _src = _active_src_subq()
        trunc = _TRUNC[granularity]

        # Volume trend: opened + resolved per bucket
        r = await self._db.execute(
            select(
                func.date_trunc(trunc, Ticket.first_ingested_at).label('bucket'),
                func.count().label('opened'),
            )
            .where(_src, Ticket.first_ingested_at.between(start, end))
            .group_by('bucket')
            .order_by('bucket')
        )
        volume_trend = [
            {'date': row.bucket.date().isoformat(), 'opened': row.opened}
            for row in r
        ]

        # Resolution trend: avg MTTR + count resolved per bucket
        r = await self._db.execute(
            select(
                func.date_trunc(
                    trunc,
                    func.coalesce(Ticket.resolved_at, Ticket.last_synced_at),
                ).label('bucket'),
                func.count().label('resolved'),
                func.avg(
                    func.extract(
                        'epoch',
                        func.coalesce(Ticket.resolved_at, Ticket.last_synced_at)
                        - Ticket.first_ingested_at,
                    ) / 3600
                ).label('avg_mttr'),
            )
            .where(
                _src,
                Ticket.status.in_(_RESOLVED),
                func.coalesce(Ticket.resolved_at, Ticket.last_synced_at).between(start, end),
            )
            .group_by('bucket')
            .order_by('bucket')
        )
        resolution_trend = [
            {
                'date': row.bucket.date().isoformat(),
                'resolved': row.resolved,
                'avg_mttr_hours': round(float(row.avg_mttr), 1) if row.avg_mttr else None,
            }
            for row in r
        ]

        # By type and by priority
        r = await self._db.execute(
            select(Ticket.type, func.count().label('cnt'))
            .where(_src, Ticket.first_ingested_at.between(start, end))
            .group_by(Ticket.type)
        )
        by_type = [{'type': row.type or 'unknown', 'count': row.cnt} for row in r]

        r = await self._db.execute(
            select(Ticket.priority, func.count().label('cnt'))
            .where(_src, Ticket.first_ingested_at.between(start, end))
            .group_by(Ticket.priority)
        )
        by_priority = [{'priority': row.priority or 'unknown', 'count': row.cnt} for row in r]

        # By agent: KPIs for each active agent in the period
        agents_r = await self._db.execute(
            select(User)
            .where(User.is_active.is_(True), User.role.in_(['admin', 'agent']))
            .order_by(User.name)
        )
        agents = list(agents_r.scalars().all())

        by_agent = []
        for agent in agents:
            r = await self._db.execute(
                select(func.count()).where(
                    _src,
                    Ticket.assigned_to_user_id == agent.id,
                    Ticket.first_ingested_at.between(start, end),
                )
            )
            total: int = r.scalar_one()

            r = await self._db.execute(
                select(func.count()).where(
                    _src,
                    Ticket.assigned_to_user_id == agent.id,
                    Ticket.status.in_(_RESOLVED),
                    func.coalesce(Ticket.resolved_at, Ticket.last_synced_at).between(start, end),
                )
            )
            resolved: int = r.scalar_one()

            r = await self._db.execute(
                select(
                    func.avg(
                        func.extract(
                            'epoch',
                            func.coalesce(Ticket.resolved_at, Ticket.last_synced_at)
                            - Ticket.first_ingested_at,
                        ) / 3600
                    )
                ).where(
                    _src,
                    Ticket.assigned_to_user_id == agent.id,
                    Ticket.status.in_(_RESOLVED),
                    func.coalesce(Ticket.resolved_at, Ticket.last_synced_at).between(start, end),
                )
            )
            mttr_raw = r.scalar_one()

            by_agent.append({
                'user_id': agent.id,
                'name': agent.name,
                'avatar': agent.avatar,
                'total': total,
                'resolved': resolved,
                'mttr_hours': round(float(mttr_raw), 1) if mttr_raw else None,
            })

        return {
            'period': {'from': start.date().isoformat(), 'to': end.date().isoformat()},
            'granularity': granularity,
            'volume_trend': volume_trend,
            'resolution_trend': resolution_trend,
            'by_type': by_type,
            'by_priority': by_priority,
            'by_agent': by_agent,
            # ML extension point: Phase 4.7 injects anomaly signals here.
            # Shape will be: insights: [{type, message, severity, affected}]
            'insights': [],
            'meta': {},
        }
