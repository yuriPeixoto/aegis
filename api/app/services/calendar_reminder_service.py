from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.calendar_event import CalendarEvent
from app.models.notification import Notification

logger = logging.getLogger(__name__)

# Quantos dias de antecedência avisar
REMINDER_DAYS_AHEAD = 1


class CalendarReminderService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def run(self) -> dict:
        """
        Cria notificações de lembrete para eventos do dia seguinte.
        Chamado pelo cron do OS ou pelo endpoint POST /v1/calendar/reminders/run.
        """
        target_date = date.today() + timedelta(days=REMINDER_DAYS_AHEAD)

        events_result = await self._db.execute(
            select(CalendarEvent).where(CalendarEvent.event_date == target_date)
        )
        events = list(events_result.scalars().all())

        created = 0
        skipped = 0

        for event in events:
            if await self._already_notified(event.id, event.agent_id):
                skipped += 1
                continue

            notif_type = (
                "on_call_reminder" if event.type == "on_call" else "training_reminder"
            )

            label = (
                f"Plantão em {target_date.strftime('%d/%m/%Y')}"
                if event.type == "on_call"
                else f"Treinamento em {target_date.strftime('%d/%m/%Y')}"
                + (f" — {event.source.name}" if event.source else "")
            )

            notif = Notification(
                user_id=event.agent_id,
                type=notif_type,
                calendar_event_id=event.id,
                event_date=target_date,
                actor_name="Aegis",
                ticket_id=None,
                ticket_subject=None,
                ticket_external_id=None,
            )
            self._db.add(notif)
            created += 1
            logger.info(
                "calendar_reminder: type=%s agent_id=%d event_date=%s label=%s",
                notif_type,
                event.agent_id,
                target_date,
                label,
            )

        await self._db.commit()
        return {
            "target_date": str(target_date),
            "events_found": len(events),
            "reminders_created": created,
            "skipped_duplicate": skipped,
        }

    async def _already_notified(self, calendar_event_id: int, agent_id: int) -> bool:
        """Evita duplicatas: verifica se já existe notificação para este evento hoje."""
        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        result = await self._db.execute(
            select(Notification).where(
                and_(
                    Notification.calendar_event_id == calendar_event_id,
                    Notification.user_id == agent_id,
                    Notification.created_at >= today_start,
                )
            )
        )
        return result.scalar_one_or_none() is not None
