from __future__ import annotations

from datetime import datetime, timedelta, timezone
from collections import defaultdict

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.source import Source
from app.models.ticket import Ticket
from app.models.ticket_message import TicketMessage
from app.models.user import User

_INACTIVE = ('pending_closure', 'resolved', 'closed', 'cancelled')


class DashboardService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_stats(self) -> dict:
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        thirty_days_ago = now - timedelta(days=30)

        # ── Scalar KPIs ──────────────────────────────────────────────────────

        r = await self._db.execute(
            select(func.count()).where(~Ticket.status.in_(_INACTIVE))
        )
        total_open: int = r.scalar_one()

        r = await self._db.execute(
            select(func.count()).where(
                ~Ticket.status.in_(_INACTIVE),
                Ticket.sla_due_at.is_not(None),
                Ticket.sla_due_at < now,
                Ticket.sla_paused_since.is_(None),  # exclude paused tickets
            )
        )
        overdue: int = r.scalar_one()

        r = await self._db.execute(
            select(func.count()).where(Ticket.status == 'waiting_client')
        )
        waiting_client: int = r.scalar_one()

        r = await self._db.execute(
            select(func.count()).where(
                ~Ticket.status.in_(_INACTIVE),
                Ticket.assigned_to_user_id.is_(None),
            )
        )
        unassigned: int = r.scalar_one()

        r = await self._db.execute(
            select(func.count()).where(Ticket.first_ingested_at >= today_start)
        )
        opened_today: int = r.scalar_one()

        r = await self._db.execute(
            select(func.count()).where(
                Ticket.status.in_(('pending_closure', 'resolved', 'closed')),
                Ticket.last_synced_at >= today_start,
            )
        )
        resolved_today: int = r.scalar_one()

        # SLA compliance — % of tickets with SLA deadline that are not overdue
        r = await self._db.execute(
            select(func.count()).where(Ticket.sla_due_at.is_not(None))
        )
        total_with_sla: int = r.scalar_one()
        sla_compliance_pct: float | None = None
        if total_with_sla > 0:
            sla_compliance_pct = round((total_with_sla - overdue) / total_with_sla * 100, 1)

        # MTTR in hours — avg resolution time for tickets resolved in the last 30 days
        r = await self._db.execute(
            select(
                func.avg(
                    func.extract(
                        'epoch', Ticket.last_synced_at - Ticket.first_ingested_at
                    )
                    / 3600
                )
            ).where(
                Ticket.status == 'resolved',
                Ticket.last_synced_at >= thirty_days_ago,
            )
        )
        mttr_raw = r.scalar_one()
        mttr_hours: float | None = round(float(mttr_raw), 1) if mttr_raw is not None else None

        # ── By priority (active tickets) ──────────────────────────────────────

        r = await self._db.execute(
            select(Ticket.priority, func.count().label('cnt'))
            .where(~Ticket.status.in_(_INACTIVE))
            .group_by(Ticket.priority)
        )
        by_priority = [{'priority': row.priority or 'unknown', 'count': row.cnt} for row in r]

        # ── By client (active tickets) ────────────────────────────────────────

        r = await self._db.execute(
            select(Ticket.source_id, Source.name, func.count().label('cnt'))
            .join(Source, Ticket.source_id == Source.id)
            .where(~Ticket.status.in_(_INACTIVE))
            .group_by(Ticket.source_id, Source.name)
            .order_by(func.count().desc())
        )
        by_client = [{'source_id': row.source_id, 'name': row.name, 'open': row.cnt} for row in r]

        # ── By agent ──────────────────────────────────────────────────────────

        agents_r = await self._db.execute(
            select(User).where(User.is_active.is_(True), User.role.in_(['admin', 'agent']))
        )
        agents = list(agents_r.scalars().all())

        by_agent = []
        for agent in agents:
            r = await self._db.execute(
                select(func.count()).where(
                    ~Ticket.status.in_(_INACTIVE),
                    Ticket.assigned_to_user_id == agent.id,
                )
            )
            agent_open: int = r.scalar_one()

            r = await self._db.execute(
                select(func.count()).where(
                    ~Ticket.status.in_(_INACTIVE),
                    Ticket.assigned_to_user_id == agent.id,
                    Ticket.sla_due_at.is_not(None),
                    Ticket.sla_due_at < now,
                    Ticket.sla_paused_since.is_(None),  # exclude paused
                )
            )
            agent_overdue: int = r.scalar_one()

            r = await self._db.execute(
                select(func.count()).where(
                    Ticket.assigned_to_user_id == agent.id,
                    Ticket.status.in_(('pending_closure', 'resolved', 'closed')),
                    Ticket.last_synced_at >= thirty_days_ago,
                )
            )
            agent_resolved: int = r.scalar_one()

            by_agent.append(
                {
                    'user_id': agent.id,
                    'name': agent.name,
                    'open': agent_open,
                    'overdue': agent_overdue,
                    'resolved_period': agent_resolved,
                }
            )

        by_agent.sort(key=lambda x: x['open'], reverse=True)

        # ── Overdue tickets list ──────────────────────────────────────────────

        r = await self._db.execute(
            select(Ticket)
            .where(
                ~Ticket.status.in_(_INACTIVE),
                Ticket.sla_due_at.is_not(None),
                Ticket.sla_due_at < now,
                Ticket.sla_paused_since.is_(None),
            )
            .options(selectinload(Ticket.source), selectinload(Ticket.assignee))
            .order_by(Ticket.sla_due_at.asc())
            .limit(10)
        )
        overdue_tickets_raw = list(r.scalars().all())

        overdue_tickets = []
        for t in overdue_tickets_raw:
            hours_overdue = int((now - t.sla_due_at).total_seconds() / 3600)
            overdue_tickets.append(
                {
                    'id': t.id,
                    'external_id': t.external_id,
                    'subject': t.subject,
                    'priority': t.priority,
                    'source_name': t.source.name if t.source else '',
                    'sla_due_at': t.sla_due_at.isoformat(),
                    'assigned_to_name': t.assignee.name if t.assignee else None,
                    'hours_overdue': hours_overdue,
                }
            )

        # ── Unassigned tickets list ───────────────────────────────────────────

        _PRIORITY_ORDER = {'urgent': 0, 'high': 1, 'medium': 2, 'low': 3}

        r = await self._db.execute(
            select(Ticket)
            .where(
                ~Ticket.status.in_(_INACTIVE),
                Ticket.assigned_to_user_id.is_(None),
            )
            .options(selectinload(Ticket.source))
            .order_by(Ticket.first_ingested_at.asc())
            .limit(20)
        )
        unassigned_tickets_raw = list(r.scalars().all())
        unassigned_tickets_raw.sort(
            key=lambda t: (_PRIORITY_ORDER.get(t.priority or '', 9), t.first_ingested_at)
        )

        unassigned_tickets = [
            {
                'id': t.id,
                'external_id': t.external_id,
                'subject': t.subject,
                'priority': t.priority,
                'source_name': t.source.name if t.source else '',
                'first_ingested_at': t.first_ingested_at.isoformat(),
            }
            for t in unassigned_tickets_raw
        ]

        return {
            'total_open': total_open,
            'overdue': overdue,
            'waiting_client': waiting_client,
            'unassigned': unassigned,
            'opened_today': opened_today,
            'resolved_today': resolved_today,
            'sla_compliance_pct': sla_compliance_pct,
            'mttr_hours': mttr_hours,
            'by_priority': by_priority,
            'by_client': by_client,
            'by_agent': by_agent,
            'overdue_tickets': overdue_tickets,
            'unassigned_tickets': unassigned_tickets,
        }

    async def get_agent_monitor(self) -> dict:
        now = datetime.now(timezone.utc)

        # Correlated subqueries for last message per ticket
        latest_dir = (
            select(TicketMessage.direction)
            .where(TicketMessage.ticket_id == Ticket.id)
            .order_by(TicketMessage.created_at.desc())
            .limit(1)
            .scalar_subquery()
            .label('latest_msg_direction')
        )
        latest_at = (
            select(TicketMessage.created_at)
            .where(TicketMessage.ticket_id == Ticket.id)
            .order_by(TicketMessage.created_at.desc())
            .limit(1)
            .scalar_subquery()
            .label('latest_msg_at')
        )

        r = await self._db.execute(
            select(Ticket, latest_dir, latest_at)
            .where(
                ~Ticket.status.in_(_INACTIVE),
                Ticket.assigned_to_user_id.is_not(None),
            )
            .options(selectinload(Ticket.assignee))
            .order_by(Ticket.sla_due_at.asc().nulls_last())
        )
        rows = r.all()

        agents_map: dict[int, dict] = {}
        tickets_by_agent: dict[int, list] = defaultdict(list)

        for ticket, msg_direction, msg_at in rows:
            agent = ticket.assignee
            if agent is None:
                continue

            if agent.id not in agents_map:
                agents_map[agent.id] = {'user_id': agent.id, 'name': agent.name}

            sla_status = _compute_sla_status(ticket, now)

            tickets_by_agent[agent.id].append({
                'id': ticket.id,
                'external_id': ticket.external_id,
                'subject': ticket.subject,
                'priority': ticket.priority,
                'status': ticket.status,
                'sla_due_at': ticket.sla_due_at.isoformat() if ticket.sla_due_at else None,
                'sla_status': sla_status,
                'has_unanswered_message': msg_direction == 'inbound',
                'last_message_at': msg_at.isoformat() if msg_at else None,
                'waiting_since': ticket.sla_paused_since.isoformat() if ticket.sla_paused_since else None,
            })

        agents = [
            {**agents_map[uid], 'tickets': tickets_by_agent[uid]}
            for uid in agents_map
        ]
        agents.sort(key=lambda a: len(a['tickets']), reverse=True)

        return {'agents': agents}


def _compute_sla_status(ticket: Ticket, now: datetime) -> str | None:
    if not ticket.sla_due_at or not ticket.sla_started_at:
        return None
    if ticket.sla_paused_since is not None:
        return 'paused'
    if ticket.sla_due_at < now:
        return 'overdue'
    total = (ticket.sla_due_at - ticket.sla_started_at).total_seconds()
    remaining = (ticket.sla_due_at - now).total_seconds()
    if total > 0 and remaining / total < 0.2:
        return 'at_risk'
    return 'ok'
