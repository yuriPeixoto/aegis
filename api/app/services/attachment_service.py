from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.ticket_attachment import TicketAttachment

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "text/plain",
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


class AttachmentService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def upload(
        self,
        ticket_id: int,
        file: UploadFile,
        user_id: int,
    ) -> TicketAttachment:
        content_type = file.content_type or "application/octet-stream"
        if content_type not in ALLOWED_CONTENT_TYPES:
            raise ValueError(f"Tipo de arquivo não permitido: {content_type}")

        content = await file.read()
        max_bytes = settings.upload_max_size_mb * 1024 * 1024
        if len(content) > max_bytes:
            raise ValueError(f"Arquivo muito grande (máximo {settings.upload_max_size_mb}MB)")

        # Build storage path: {upload_dir}/{ticket_id}/{uuid}{.ext}
        suffix = Path(file.filename or "file").suffix
        stored_name = f"{uuid.uuid4().hex}{suffix}"
        relative_path = f"{ticket_id}/{stored_name}"

        absolute_dir = Path(settings.upload_dir) / str(ticket_id)
        absolute_dir.mkdir(parents=True, exist_ok=True)
        (absolute_dir / stored_name).write_bytes(content)

        attachment = TicketAttachment(
            ticket_id=ticket_id,
            uploaded_by_user_id=user_id,
            original_filename=file.filename or stored_name,
            stored_path=relative_path,
            content_type=content_type,
            size_bytes=len(content),
        )
        self._db.add(attachment)
        await self._db.commit()
        await self._db.refresh(attachment)
        return attachment

    async def list_attachments(self, ticket_id: int) -> list[TicketAttachment]:
        result = await self._db.execute(
            select(TicketAttachment)
            .where(TicketAttachment.ticket_id == ticket_id)
            .order_by(TicketAttachment.created_at)
        )
        return list(result.scalars().all())

    async def get(self, attachment_id: int) -> TicketAttachment | None:
        result = await self._db.execute(
            select(TicketAttachment).where(TicketAttachment.id == attachment_id)
        )
        return result.scalar_one_or_none()

    async def store_from_bytes(
        self,
        ticket_id: int,
        filename: str,
        content_type: str,
        content: bytes,
        user_id: int | None = None,
    ) -> TicketAttachment:
        if content_type not in ALLOWED_CONTENT_TYPES:
            raise ValueError(f"Tipo de arquivo não permitido: {content_type}")

        max_bytes = settings.upload_max_size_mb * 1024 * 1024
        if len(content) > max_bytes:
            raise ValueError(f"Arquivo muito grande (máximo {settings.upload_max_size_mb}MB)")

        suffix = Path(filename).suffix
        stored_name = f"{uuid.uuid4().hex}{suffix}"
        relative_path = f"{ticket_id}/{stored_name}"

        absolute_dir = Path(settings.upload_dir) / str(ticket_id)
        absolute_dir.mkdir(parents=True, exist_ok=True)
        (absolute_dir / stored_name).write_bytes(content)

        attachment = TicketAttachment(
            ticket_id=ticket_id,
            uploaded_by_user_id=user_id,
            original_filename=filename,
            stored_path=relative_path,
            content_type=content_type,
            size_bytes=len(content),
        )
        self._db.add(attachment)
        await self._db.commit()
        await self._db.refresh(attachment)
        return attachment

    def resolve_path(self, attachment: TicketAttachment) -> Path:
        return Path(settings.upload_dir) / attachment.stored_path
