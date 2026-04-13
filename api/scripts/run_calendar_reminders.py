"""
Cria notificações de lembrete para eventos de calendário do dia seguinte.

Uso:
    python scripts/run_calendar_reminders.py

Cron sugerido (roda todo dia às 08:00):
    0 8 * * * cd /path/to/aegis/api && python scripts/run_calendar_reminders.py >> /var/log/aegis/calendar_reminders.log 2>&1
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.database import AsyncSessionLocal
from app.services.calendar_reminder_service import CalendarReminderService


async def main() -> None:
    async with AsyncSessionLocal() as db:
        service = CalendarReminderService(db)
        result = await service.run()
        print(
            f"[calendar_reminders] date={result['target_date']} "
            f"events={result['events_found']} "
            f"created={result['reminders_created']} "
            f"skipped={result['skipped_duplicate']}"
        )


if __name__ == "__main__":
    asyncio.run(main())
