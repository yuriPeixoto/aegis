from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.models.escalation_rule import EscalationRule, TicketEscalation
from app.models.tag import Tag, ticket_tags
from app.models.ticket import Ticket
from app.models.ticket_event import TicketEvent
from app.models.ticket_message import TicketMessage
from app.models.user import User
from app.schemas.escalation import EscalationRuleCreate, EscalationRuleUpdate

logger = logging.getLogger(__name__)

_TERMINAL_STATUSES = {"resolved", "closed", "cancelled", "merged"}

_PRIORITY_ORDER = ["low", "medium", "high", "urgent"]


def _bump_priority(current: str | None) -> str | None:
    if current is None:
        return None
    try:
        idx = _PRIORITY_ORDER.index(current.lower())
        if idx < len(_PRIORITY_ORDER) - 1:
            return _PRIORITY_ORDER[idx + 1]
    except ValueError:
        pass
    return current


class EscalationService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    # ── CRUD ──────────────────────────────────────────────────────────────────

    async def list_rules(self) -> list[EscalationRule]:
        result = await self._db.execute(
            select(EscalationRule).order_by(EscalationRule.created_at)
        )
        return list(result.scalars().all())

    async def get_rule(self, rule_id: int) -> EscalationRule | None:
        result = await self._db.execute(
            select(EscalationRule).where(EscalationRule.id == rule_id)
        )
        return result.scalar_one_or_none()

    async def create_rule(self, data: EscalationRuleCreate) -> EscalationRule:
        rule = EscalationRule(
            name=data.name,
            is_active=data.is_active,
            trigger_type=data.trigger_type,
            trigger_hours=data.trigger_hours,
            condition_priority=data.condition_priority,
            condition_status=data.condition_status,
            action_type=data.action_type,
            action_user_id=data.action_user_id,
            action_tag_id=data.action_tag_id,
            cooldown_hours=data.cooldown_hours,
        )
        self._db.add(rule)
        await self._db.commit()
        await self._db.refresh(rule)
        return rule

    async def update_rule(
        self, rule_id: int, data: EscalationRuleUpdate
    ) -> EscalationRule | None:
        rule = await self.get_rule(rule_id)
        if rule is None:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(rule, field, value)
        await self._db.commit()
        await self._db.refresh(rule)
        return rule

    async def delete_rule(self, rule_id: int) -> bool:
        rule = await self.get_rule(rule_id)
        if rule is None:
            return False
        await self._db.delete(rule)
        await self._db.commit()
        return True

    # ── Run ───────────────────────────────────────────────────────────────────

    async def run(self) -> dict:
        """Evaluate all active rules against active tickets. Called by cron."""
        now = datetime.now(tz=timezone.utc)
        rules_result = await self._db.execute(
            select(EscalationRule).where(EscalationRule.is_active.is_(True))
        )
        rules = list(rules_result.scalars().all())

        tickets_escalated = 0
        actions_taken: list[str] = []

        for rule in rules:
            count, taken = await self._run_rule(rule, now)
            tickets_escalated += count
            actions_taken.extend(taken)

        return {
            "rules_evaluated": len(rules),
            "tickets_escalated": tickets_escalated,
            "actions_taken": actions_taken,
        }

    async def _run_rule(
        self, rule: EscalationRule, now: datetime
    ) -> tuple[int, list[str]]:
        tickets = await self._fetch_candidate_tickets(rule, now)
        count = 0
        taken: list[str] = []

        for ticket in tickets:
            if not await self._should_trigger(rule, ticket, now):
                continue
            action_desc = await self._apply_action(rule, ticket, now)
            if action_desc:
                await self._log_escalation(rule, ticket.id, now)
                count += 1
                taken.append(action_desc)
                logger.info(
                    "escalation: rule=%d ticket=%d action=%s",
                    rule.id,
                    ticket.id,
                    action_desc,
                )

        return count, taken

    async def _fetch_candidate_tickets(
        self, rule: EscalationRule, now: datetime
    ) -> list[Ticket]:
        stmt = select(Ticket).where(
            Ticket.status.notin_(_TERMINAL_STATUSES),
        )

        # Apply condition filters
        if rule.condition_priority:
            stmt = stmt.where(Ticket.priority.in_(rule.condition_priority))
        if rule.condition_status:
            stmt = stmt.where(Ticket.status.in_(rule.condition_status))

        # Trigger-type pre-filter at SQL level where possible
        threshold = now - timedelta(hours=rule.trigger_hours)
        if rule.trigger_type == "sla_breach":
            stmt = stmt.where(
                Ticket.sla_due_at.isnot(None),
                Ticket.sla_due_at <= now,
            )
        elif rule.trigger_type == "sla_at_risk":
            stmt = stmt.where(
                Ticket.sla_due_at.isnot(None),
                Ticket.sla_due_at > now,
                Ticket.sla_due_at <= now + timedelta(hours=rule.trigger_hours),
            )
        elif rule.trigger_type == "unassigned_time":
            stmt = stmt.where(
                Ticket.assigned_to_user_id.is_(None),
                Ticket.first_ingested_at <= threshold,
            )
        # no_update is handled post-fetch using messages/events

        result = await self._db.execute(stmt)
        return list(result.scalars().all())

    async def _should_trigger(
        self, rule: EscalationRule, ticket: Ticket, now: datetime
    ) -> bool:
        # Check cooldown: has this rule already fired for this ticket recently?
        cooldown_cutoff = now - timedelta(hours=rule.cooldown_hours)
        existing = await self._db.execute(
            select(TicketEscalation).where(
                TicketEscalation.ticket_id == ticket.id,
                TicketEscalation.rule_id == rule.id,
                TicketEscalation.triggered_at >= cooldown_cutoff,
            )
        )
        if existing.scalar_one_or_none() is not None:
            return False

        # For no_update: check when the ticket last had activity
        if rule.trigger_type == "no_update":
            last_activity = await self._last_activity_at(ticket.id)
            if last_activity is None:
                last_activity = ticket.first_ingested_at
            threshold = now - timedelta(hours=rule.trigger_hours)
            if last_activity > threshold:
                return False

        return True

    async def _last_activity_at(self, ticket_id: int) -> datetime | None:
        msg_result = await self._db.execute(
            select(TicketMessage.created_at)
            .where(TicketMessage.ticket_id == ticket_id)
            .order_by(TicketMessage.created_at.desc())
            .limit(1)
        )
        last_msg = msg_result.scalar_one_or_none()

        ev_result = await self._db.execute(
            select(TicketEvent.occurred_at)
            .where(TicketEvent.ticket_id == ticket_id)
            .order_by(TicketEvent.occurred_at.desc())
            .limit(1)
        )
        last_ev = ev_result.scalar_one_or_none()

        candidates = [t for t in [last_msg, last_ev] if t is not None]
        return max(candidates) if candidates else None

    async def _apply_action(
        self, rule: EscalationRule, ticket: Ticket, now: datetime
    ) -> str | None:
        if rule.action_type == "reassign_to_user":
            if rule.action_user_id is None:
                return None
            await self._db.execute(
                update(Ticket)
                .where(Ticket.id == ticket.id)
                .values(assigned_to_user_id=rule.action_user_id)
            )
            user_result = await self._db.execute(
                select(User).where(User.id == rule.action_user_id)
            )
            user = user_result.scalar_one_or_none()
            user_name = user.name if user else f"user#{rule.action_user_id}"
            self._db.add(
                TicketEvent(
                    ticket_id=ticket.id,
                    event_type="escalation_reassigned",
                    payload={"rule": rule.name, "assigned_to": user_name},
                    occurred_at=now,
                )
            )
            return f"ticket#{ticket.id}: reassigned to {user_name} (rule: {rule.name})"

        elif rule.action_type == "increase_priority":
            new_priority = _bump_priority(ticket.priority)
            if new_priority == ticket.priority:
                return None  # already at max
            await self._db.execute(
                update(Ticket)
                .where(Ticket.id == ticket.id)
                .values(priority=new_priority)
            )
            self._db.add(
                TicketEvent(
                    ticket_id=ticket.id,
                    event_type="escalation_priority_increased",
                    payload={
                        "rule": rule.name,
                        "from": ticket.priority,
                        "to": new_priority,
                    },
                    occurred_at=now,
                )
            )
            return f"ticket#{ticket.id}: priority {ticket.priority} → {new_priority} (rule: {rule.name})"

        elif rule.action_type == "add_tag":
            if rule.action_tag_id is None:
                return None
            tag_result = await self._db.execute(
                select(Tag).where(Tag.id == rule.action_tag_id)
            )
            tag = tag_result.scalar_one_or_none()
            if tag is None:
                return None
            stmt = (
                pg_insert(ticket_tags)
                .values(ticket_id=ticket.id, tag_id=tag.id)
                .on_conflict_do_nothing()
            )
            await self._db.execute(stmt)
            self._db.add(
                TicketEvent(
                    ticket_id=ticket.id,
                    event_type="escalation_tag_added",
                    payload={"rule": rule.name, "tag": tag.name},
                    occurred_at=now,
                )
            )
            return f"ticket#{ticket.id}: tag '{tag.name}' added (rule: {rule.name})"

        elif rule.action_type in ("notify_admins", "notify_senior_agents"):
            mention_ids = await self._get_notify_user_ids(rule.action_type)
            if not mention_ids:
                return None
            note = TicketMessage(
                ticket_id=ticket.id,
                direction="outbound",
                author_name="Aegis (automático)",
                body=f"🚨 Escalação automática — regra: **{rule.name}**",
                is_internal=True,
                author_user_id=None,
                mentioned_user_ids=mention_ids,
                created_at=now,
            )
            self._db.add(note)
            self._db.add(
                TicketEvent(
                    ticket_id=ticket.id,
                    event_type="escalation_notified",
                    payload={"rule": rule.name, "action": rule.action_type},
                    occurred_at=now,
                )
            )
            return (
                f"ticket#{ticket.id}: notified "
                f"{'admins' if rule.action_type == 'notify_admins' else 'senior agents'} "
                f"(rule: {rule.name})"
            )

        return None

    async def _get_notify_user_ids(self, action_type: str) -> list[int]:
        if action_type == "notify_admins":
            result = await self._db.execute(
                select(User.id).where(User.role == "admin", User.is_active.is_(True))
            )
        else:
            result = await self._db.execute(
                select(User.id).where(
                    User.is_senior.is_(True),
                    User.is_active.is_(True),
                )
            )
        return list(result.scalars().all())

    async def _log_escalation(
        self, rule: EscalationRule, ticket_id: int, now: datetime
    ) -> None:
        log = TicketEscalation(
            ticket_id=ticket_id,
            rule_id=rule.id,
            rule_name=rule.name,
            triggered_at=now,
        )
        self._db.add(log)
        await self._db.commit()
