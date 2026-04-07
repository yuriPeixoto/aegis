from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.models.ticket import Ticket
from app.models.ticket_message import TicketMessage
from app.models.user import User


class NotificationService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create_mention_notifications(
        self,
        message: TicketMessage,
        ticket: Ticket,
        actor_name: str,
        mentioned_user_ids: list[int],
    ) -> None:
        """Create a 'mention' notification for each mentioned user (skip the actor if they mentioned themselves)."""
        if not mentioned_user_ids:
            return

        # Load mentioned users in one query to validate they exist and are active
        result = await self._db.execute(
            select(User).where(
                User.id.in_(mentioned_user_ids),
                User.is_active.is_(True),
            )
        )
        users = result.scalars().all()

        for user in users:
            notif = Notification(
                user_id=user.id,
                type="mention",
                ticket_id=ticket.id,
                message_id=message.id,
                actor_name=actor_name,
                ticket_subject=ticket.subject,
                ticket_external_id=ticket.external_id,
            )
            self._db.add(notif)

        await self._db.commit()

    async def create_new_ticket_notifications(
        self,
        ticket: Ticket,
        source_name: str,
    ) -> None:
        """Notify admins and the assigned agent when a new high/urgent ticket arrives."""
        if ticket.priority not in ("high", "urgent"):
            return

        recipients = await self._resolve_ticket_recipients(ticket)
        for user in recipients:
            self._db.add(Notification(
                user_id=user.id,
                type="new_ticket",
                ticket_id=ticket.id,
                actor_name=source_name,
                ticket_subject=ticket.subject,
                ticket_external_id=ticket.external_id,
            ))
        await self._db.commit()

    async def create_new_message_notifications(
        self,
        ticket: Ticket,
        author_name: str,
    ) -> None:
        """Notify admins and the assigned agent when a client sends a new message."""
        recipients = await self._resolve_ticket_recipients(ticket)
        for user in recipients:
            self._db.add(Notification(
                user_id=user.id,
                type="new_client_message",
                ticket_id=ticket.id,
                actor_name=author_name,
                ticket_subject=ticket.subject,
                ticket_external_id=ticket.external_id,
            ))
        await self._db.commit()

    async def _resolve_ticket_recipients(self, ticket: Ticket) -> list[User]:
        """Return all active admins + the assigned agent (deduplicated)."""
        result = await self._db.execute(
            select(User).where(User.is_active.is_(True), User.role == "admin")
        )
        recipients: dict[int, User] = {u.id: u for u in result.scalars().all()}

        if ticket.assigned_to_user_id and ticket.assigned_to_user_id not in recipients:
            result = await self._db.execute(
                select(User).where(
                    User.id == ticket.assigned_to_user_id,
                    User.is_active.is_(True),
                )
            )
            agent = result.scalar_one_or_none()
            if agent:
                recipients[agent.id] = agent

        return list(recipients.values())

    async def list_for_user(self, user_id: int, limit: int = 20) -> list[Notification]:
        result = await self._db.execute(
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def unread_count(self, user_id: int) -> int:
        result = await self._db.execute(
            select(func.count()).where(
                Notification.user_id == user_id,
                Notification.read_at.is_(None),
            )
        )
        return result.scalar_one()

    async def mark_read(self, notification_id: int, user_id: int) -> None:
        await self._db.execute(
            update(Notification)
            .where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
                Notification.read_at.is_(None),
            )
            .values(read_at=datetime.now(timezone.utc))
        )
        await self._db.commit()

    async def mark_all_read(self, user_id: int) -> None:
        await self._db.execute(
            update(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.read_at.is_(None),
            )
            .values(read_at=datetime.now(timezone.utc))
        )
        await self._db.commit()

    async def mark_ticket_notifications_read(self, user_id: int, ticket_id: int) -> None:
        """Auto-mark all notifications for this ticket as read when the user opens it."""
        await self._db.execute(
            update(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.ticket_id == ticket_id,
                Notification.read_at.is_(None),
            )
            .values(read_at=datetime.now(timezone.utc))
        )
        await self._db.commit()
