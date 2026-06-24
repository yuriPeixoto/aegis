from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.source import Source  # noqa: F401 — loaded via selectinload
from app.models.tag import Tag
from app.models.ticket import Ticket
from app.models.ticket_event import TicketEvent  # active — needed to create status_changed events
from app.models.ticket_message import TicketMessage
from app.models.user import User  # noqa: F401 — loaded via selectinload
from app.services.sla_service import SlaService

_ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "open": {"in_progress", "cancelled"},
    "in_progress": {"pending_closure", "cancelled"},
    "pending_closure": {"in_progress", "closed"},
    "resolved": {"open", "closed"},  # mantido por retrocompatibilidade
    "closed": set(),
    "cancelled": set(),
    "merged": set(),
}


class TicketService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    _TERMINAL_STATUSES = ("resolved", "closed", "cancelled", "merged")

    async def list_tickets(
        self,
        *,
        source_id: int | None = None,
        status: str | None = None,
        priority: str | None = None,
        type: str | None = None,
        assigned_to_user_id: int | None = None,
        unassigned: bool = False,
        active_only: bool = False,
        search: str | None = None,
        created_after: datetime | None = None,
        created_before: datetime | None = None,
        tag_ids: list[int] | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Ticket], int, dict[int, datetime | None]]:
        query = (
            select(Ticket)
            .join(Source, Ticket.source_id == Source.id)
            .where(Source.is_active.is_(True))
        )

        if tag_ids:
            # Filter tickets that have ALL specified tags (AND logic)
            # Or use ANY? Zendesk tags usually work as "has any of these" or "has all".
            # Let's start with "has any of these" for simpler filtering unless specified otherwise.
            query = query.join(Ticket.tags).where(Tag.id.in_(tag_ids))
            # If we wanted AND logic, we'd need multiple joins or a subquery with count.

        if source_id is not None:
            query = query.where(Ticket.source_id == source_id)
        if active_only:
            query = query.where(Ticket.status.notin_(self._TERMINAL_STATUSES))
        elif status is not None:
            query = query.where(Ticket.status == status)
        if priority is not None:
            query = query.where(Ticket.priority == priority)
        if type is not None:
            query = query.where(Ticket.type == type)
        if unassigned:
            query = query.where(Ticket.assigned_to_user_id.is_(None))
        elif assigned_to_user_id is not None:
            query = query.where(Ticket.assigned_to_user_id == assigned_to_user_id)
        if search is not None:
            term = f"%{search}%"
            from sqlalchemy import or_

            query = query.where(or_(Ticket.subject.ilike(term), Ticket.external_id.ilike(term)))
        if created_after is not None:
            query = query.where(Ticket.first_ingested_at >= created_after)
        if created_before is not None:
            query = query.where(Ticket.first_ingested_at <= created_before)

        count_result = await self._db.execute(select(func.count()).select_from(query.subquery()))
        total = count_result.scalar_one()

        # Terminal statuses sink to the bottom; within each group sort by priority then recency
        _terminal_rank = case(
            (Ticket.status.in_(self._TERMINAL_STATUSES), 1),
            else_=0,
        )
        _priority_rank = case(
            (Ticket.priority == "urgent", 1),
            (Ticket.priority == "high", 2),
            (Ticket.priority == "medium", 3),
            (Ticket.priority == "low", 4),
            else_=5,
        )
        result = await self._db.execute(
            query.options(
                selectinload(Ticket.source),
                selectinload(Ticket.assignee),
                selectinload(Ticket.tags),
            )
            .order_by(_terminal_rank, _priority_rank, Ticket.first_ingested_at.desc())
            .limit(limit)
            .offset(offset)
        )
        tickets = list(result.scalars().all())

        # Compute last inbound message timestamp per ticket in one query
        inbound_map: dict[int, datetime | None] = {}
        if tickets:
            ticket_ids = [t.id for t in tickets]
            inbound_result = await self._db.execute(
                select(
                    TicketMessage.ticket_id,
                    func.max(TicketMessage.created_at).label("last_inbound_at"),
                )
                .where(TicketMessage.ticket_id.in_(ticket_ids))
                .where(TicketMessage.direction == "inbound")
                .group_by(TicketMessage.ticket_id)
            )
            inbound_map = {row.ticket_id: row.last_inbound_at for row in inbound_result}

        return tickets, total, inbound_map

    async def get_ticket(self, ticket_id: int) -> Ticket | None:
        result = await self._db.execute(
            select(Ticket)
            .where(Ticket.id == ticket_id)
            .options(
                selectinload(Ticket.source),
                selectinload(Ticket.events),
                selectinload(Ticket.assignee),
                selectinload(Ticket.tags),
            )
        )
        return result.scalar_one_or_none()

    async def assign_ticket(
        self, ticket_id: int, user_id: int | None, assigned_by_name: str
    ) -> Ticket | None:
        ticket = await self.get_ticket(ticket_id)
        if ticket is None:
            return None

        previous_assignee_name: str | None = ticket.assignee.name if ticket.assignee else None

        new_assignee_name: str | None = None
        if user_id is not None:
            user_result = await self._db.execute(select(User).where(User.id == user_id))
            new_user = user_result.scalar_one_or_none()
            if new_user:
                new_assignee_name = new_user.name

        ticket.assigned_to_user_id = user_id

        event_payload: dict = {
            "assigned_by": assigned_by_name,
            "assigned_to": new_assignee_name,
        }
        if previous_assignee_name:
            event_payload["previous_assignee"] = previous_assignee_name

        self._db.add(TicketEvent(ticket_id=ticket_id, event_type="assigned", payload=event_payload))

        await self._db.commit()
        result = await self._db.execute(
            select(Ticket)
            .where(Ticket.id == ticket_id)
            .options(
                selectinload(Ticket.source),
                selectinload(Ticket.events),
                selectinload(Ticket.assignee),
                selectinload(Ticket.tags),
            )
        )
        return result.scalar_one_or_none()

    async def update_ticket_status(
        self,
        ticket_id: int,
        new_status: str,
        changed_by_user_id: int,
        comment: str | None = None,
        deployment_scheduled_at: datetime | None = None,
        pr_number: str | None = None,
    ) -> tuple[Ticket | None, str | None]:
        """Return (ticket, None) on success, or (None, error_message) on failure."""
        ticket = await self.get_ticket(ticket_id)
        if ticket is None:
            return None, "not_found"

        allowed = _ALLOWED_TRANSITIONS.get(ticket.status, set())
        if new_status not in allowed:
            return None, f"transition_invalid:{ticket.status}>{new_status}"

        old_status = ticket.status
        ticket.status = new_status

        now = datetime.now(UTC)
        await SlaService(self._db).on_status_changed(ticket, old_status, new_status, now)

        event = TicketEvent(
            ticket_id=ticket_id,
            event_type="status_changed",
            payload={
                "from": old_status,
                "to": new_status,
                "changed_by_user_id": changed_by_user_id,
                **({"comment": comment} if comment else {}),
            },
        )
        self._db.add(event)

        if new_status == "pending_closure" and deployment_scheduled_at is not None:
            from app.models.calendar_event import EVENT_TYPE_DEPLOYMENT, CalendarEvent

            ticket.deployment_scheduled_at = deployment_scheduled_at
            if pr_number:
                ticket.pr_number = pr_number

            agent_id = ticket.assigned_to_user_id or changed_by_user_id
            notes = f"Chamado #{ticket.external_id}"
            if pr_number:
                notes += f" — PR #{pr_number}"

            self._db.add(
                CalendarEvent(
                    type=EVENT_TYPE_DEPLOYMENT,
                    agent_id=agent_id,
                    event_date=deployment_scheduled_at.date(),
                    start_time=deployment_scheduled_at.strftime("%H:%M"),
                    source_id=ticket.source_id,
                    ticket_id=ticket_id,
                    notes=notes,
                )
            )
            self._db.add(
                TicketEvent(
                    ticket_id=ticket_id,
                    event_type="deployment_scheduled",
                    payload={
                        "deployment_at": deployment_scheduled_at.isoformat(),
                        **({"pr_number": pr_number} if pr_number else {}),
                    },
                )
            )

        await self._db.commit()

        result = await self._db.execute(
            select(Ticket)
            .where(Ticket.id == ticket_id)
            .options(
                selectinload(Ticket.source),
                selectinload(Ticket.events),
                selectinload(Ticket.assignee),
                selectinload(Ticket.tags),
            )
        )
        return result.scalar_one_or_none(), None

    async def bulk_update(
        self,
        ticket_ids: list[int],
        *,
        status: str | None = None,
        priority: str | None = None,
        assigned_to_user_id: int | None = None,
        changed_by_user_name: str,
        comment: str | None = None,
    ) -> list[Ticket]:
        """Update multiple tickets at once. Returns the list of updated tickets."""
        # Note: In a large production system, we'd use a single UPDATE ... WHERE id IN (...)
        # for performance. But Aegis needs to trigger SLA logic, events, and webhooks
        # per ticket. We iterate for now, which is safe for typical bulk sizes (20-50).
        updated_tickets = []
        for tid in ticket_ids:
            ticket = await self.get_ticket(tid)
            if not ticket:
                continue

            changed = False
            if status and ticket.status != status:
                # We skip transition validation for bulk updates to allow "cleanup" actions
                old_status = ticket.status
                ticket.status = status
                self._db.add(
                    TicketEvent(
                        ticket_id=ticket.id,
                        event_type="status_changed",
                        payload={
                            "old_status": old_status,
                            "new_status": status,
                            "changed_by": changed_by_user_name,
                            **({"comment": comment} if comment else {}),
                        },
                    )
                )
                await SlaService(self._db).on_status_changed(
                    ticket, old_status, status, datetime.now(UTC)
                )
                changed = True

            if priority and ticket.priority != priority:
                old_priority = ticket.priority
                ticket.priority = priority
                self._db.add(
                    TicketEvent(
                        ticket_id=ticket.id,
                        event_type="priority_changed",
                        payload={
                            "old_priority": old_priority,
                            "new_priority": priority,
                            "changed_by": changed_by_user_name,
                        },
                    )
                )
                changed = True

            if (
                assigned_to_user_id is not None
                and ticket.assigned_to_user_id != assigned_to_user_id
            ):  # noqa: E501
                ticket.assigned_to_user_id = assigned_to_user_id
                self._db.add(
                    TicketEvent(
                        ticket_id=ticket.id,
                        event_type="assigned",
                        payload={
                            "assigned_to_user_id": assigned_to_user_id,
                            "changed_by": changed_by_user_name,
                        },
                    )
                )
                changed = True

            if changed:
                self._db.add(ticket)
                updated_tickets.append(ticket)

        if updated_tickets:
            await self._db.commit()
            # Re-fetch with eager loading.  populate_existing=True forces SQLAlchemy
            # to overwrite any stale identity-map cache with fresh DB data and load
            # the declared relationships via selectin (avoids MissingGreenlet in async).
            updated_ids = [t.id for t in updated_tickets]
            result = await self._db.execute(
                select(Ticket)
                .where(Ticket.id.in_(updated_ids))
                .options(
                    selectinload(Ticket.source),
                    selectinload(Ticket.assignee),
                    selectinload(Ticket.tags),
                )
                .execution_options(populate_existing=True)
            )
            return list(result.scalars().all())

        return updated_tickets

    async def create_internal_ticket(
        self,
        subject: str,
        description: str,
        type: str,
        priority: str,
        user_id: int,
        meta: dict | None = None,
        source_id: int | None = None,
    ) -> Ticket:
        if source_id is not None:
            source_result = await self._db.execute(select(Source).where(Source.id == source_id, Source.is_active == True))  # noqa: E712
            source = source_result.scalar_one_or_none()
            if source is None:
                raise ValueError(f"Source {source_id} not found or inactive")
        else:
            # Default: Aegis Internal source
            source_result = await self._db.execute(select(Source).where(Source.slug == "aegis"))
            source = source_result.scalar_one_or_none()

            if source is None:
                # Fallback to create the source if it doesn't exist, to prevent 500 errors
                import secrets

                from app.core.security import generate_api_key, hash_api_key

                plain_key = generate_api_key()
                webhook_secret = secrets.token_hex(32)
                source = Source(
                    name="Aegis Internal",
                    slug="aegis",
                    api_key_hash=hash_api_key(plain_key),
                    webhook_secret=webhook_secret,
                    is_active=True,
                )
                self._db.add(source)
                await self._db.flush()

        # Generate external_id: AEGIS-<timestamp>
        now = datetime.now(UTC)
        external_id = f"AEGIS-{int(now.timestamp())}"

        ticket = Ticket(
            source_id=source.id,
            external_id=external_id,
            type=type,
            priority=priority,
            status="open",
            subject=subject,
            description=description,
            source_metadata={
                **(meta or {}),
                "reported_by_user_id": user_id,
            },
            source_created_at=now,
            source_updated_at=now,
        )
        self._db.add(ticket)
        await self._db.flush()

        # Create initial event
        event = TicketEvent(
            ticket_id=ticket.id,
            event_type="created",
            payload={
                "created_by_user_id": user_id,
                "via": "internal_portal",
            },
            occurred_at=now,
        )
        self._db.add(event)

        await self._db.commit()

        # Return the ticket with relationships loaded
        result = await self._db.execute(
            select(Ticket)
            .where(Ticket.id == ticket.id)
            .options(
                selectinload(Ticket.source),
                selectinload(Ticket.events),
                selectinload(Ticket.assignee),
                selectinload(Ticket.tags),
            )
        )
        return result.scalar_one()

    async def merge_ticket(
        self,
        source_ticket_id: int,
        target_ticket_id: int,
        merged_by_name: str,
    ) -> tuple[Ticket, None] | tuple[None, str]:
        """Merge source_ticket into target_ticket.

        All messages are moved to the target. Source becomes status='merged'.
        Returns (target_ticket, None) on success or (None, error_str) on failure.
        """
        if source_ticket_id == target_ticket_id:
            return None, "cannot_merge_into_self"

        source = await self.get_ticket(source_ticket_id)
        if source is None:
            return None, "source_not_found"
        if source.status == "merged":
            return None, "source_already_merged"

        target = await self.get_ticket(target_ticket_id)
        if target is None:
            return None, "target_not_found"
        if target.status == "merged":
            return None, "target_already_merged"

        now = datetime.now(UTC)

        # Move all messages from source to target
        await self._db.execute(
            TicketMessage.__table__.update()  # type: ignore[attr-defined]
            .where(TicketMessage.ticket_id == source_ticket_id)
            .values(ticket_id=target_ticket_id)
        )

        # Auto-note on target explaining the merge
        merge_note_target = TicketMessage(
            ticket_id=target_ticket_id,
            direction="outbound",
            author_name=merged_by_name,
            body=(
                f"Ticket #{source.external_id} foi mesclado neste ticket por {merged_by_name}. "
                f"O histórico de mensagens foi incorporado à conversa."
            ),
            is_internal=True,
            mentioned_user_ids=[],
            created_at=now,
        )
        self._db.add(merge_note_target)

        # Auto-note on source (stays as its own record for audit trail)
        merge_note_source = TicketMessage(
            ticket_id=source_ticket_id,
            direction="outbound",
            author_name=merged_by_name,
            body=f"Este ticket foi mesclado em #{target.external_id} por {merged_by_name}.",
            is_internal=True,
            mentioned_user_ids=[],
            created_at=now,
        )
        self._db.add(merge_note_source)

        # Events on both tickets
        self._db.add(
            TicketEvent(
                ticket_id=target_ticket_id,
                event_type="ticket_merged_in",
                payload={"merged_from": source.external_id, "by": merged_by_name},
                occurred_at=now,
            )
        )
        self._db.add(
            TicketEvent(
                ticket_id=source_ticket_id,
                event_type="merged",
                payload={"merged_into": target.external_id, "by": merged_by_name},
                occurred_at=now,
            )
        )

        # Mark source as merged
        source.status = "merged"
        source.merged_into_ticket_id = target_ticket_id
        source.merged_at = now
        self._db.add(source)

        await self._db.commit()

        # Return target with fresh relationships
        result = await self._db.execute(
            select(Ticket)
            .where(Ticket.id == target_ticket_id)
            .options(
                selectinload(Ticket.source),
                selectinload(Ticket.events),
                selectinload(Ticket.assignee),
                selectinload(Ticket.tags),
            )
        )
        return result.scalar_one(), None

    async def update_tags(
        self, ticket_id: int, tag_ids: list[int], changed_by: str
    ) -> Ticket | None:
        ticket = await self.get_ticket(ticket_id)
        if not ticket:
            return None

        # Fetch tags
        result = await self._db.execute(select(Tag).where(Tag.id.in_(tag_ids)))
        new_tags = list(result.scalars().all())

        old_tag_names = [t.name for t in ticket.tags]
        new_tag_names = [t.name for t in new_tags]

        if set(old_tag_names) != set(new_tag_names):
            ticket.tags = new_tags
            self._db.add(
                TicketEvent(
                    ticket_id=ticket.id,
                    event_type="tags_updated",
                    payload={
                        "old_tags": old_tag_names,
                        "new_tags": new_tag_names,
                        "changed_by": changed_by,
                    },
                )
            )
            await self._db.commit()
            await self._db.refresh(ticket, ["tags", "source", "assignee"])

        return ticket
