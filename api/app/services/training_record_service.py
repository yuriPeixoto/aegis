from __future__ import annotations

import base64
import binascii
from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import generate_api_key
from app.models.training_participant import TrainingParticipant
from app.models.training_record import STATUS_COMPLETED, STATUS_DRAFT, TrainingRecord
from app.schemas.training_record import (
    ParticipantCreate,
    PublicSignRequest,
    TrainingRecordCreate,
    TrainingRecordUpdate,
)

TOKEN_VALIDITY_DAYS = 7


def _decode_signature(signature_data: str) -> bytes:
    """Accepts a data: URL (data:image/png;base64,....) or raw base64."""
    payload = signature_data
    if "," in payload and payload.strip().lower().startswith("data:"):
        payload = payload.split(",", 1)[1]
    try:
        return base64.b64decode(payload, validate=True)
    except (binascii.Error, ValueError) as e:
        raise ValueError("Invalid base64 signature data") from e


class TrainingRecordService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    # ── Storage helpers ──────────────────────────────────────────────────────

    def _signature_dir(self, record_id: int) -> Path:
        d = Path(settings.upload_dir) / "training" / str(record_id)
        d.mkdir(parents=True, exist_ok=True)
        return d

    def _store_signature(self, record_id: int, filename: str, signature_data: str) -> str:
        content = _decode_signature(signature_data)
        if len(content) > 2 * 1024 * 1024:
            raise ValueError("Signature image too large")
        path = self._signature_dir(record_id) / filename
        path.write_bytes(content)
        return f"{record_id}/{filename}"

    def read_signature_base64(self, relative_path: str | None) -> str | None:
        if not relative_path:
            return None
        full_path = Path(settings.upload_dir) / "training" / relative_path
        if not full_path.exists():
            return None
        return base64.b64encode(full_path.read_bytes()).decode("ascii")

    # ── CRUD ─────────────────────────────────────────────────────────────────

    async def create(self, data: TrainingRecordCreate, created_by_user_id: int) -> TrainingRecord:
        record = TrainingRecord(
            calendar_event_id=data.calendar_event_id,
            source_id=data.source_id,
            training_name=data.training_name,
            system_module=data.system_module,
            version=data.version,
            training_date=data.training_date,
            start_time=data.start_time,
            end_time=data.end_time,
            workload_hours=data.workload_hours,
            modality=data.modality,
            training_type=data.training_type,
            area_sector=data.area_sector,
            instructor_user_id=data.instructor_user_id,
            instructor_title=data.instructor_title,
            modules_json=[m.model_dump() for m in data.modules],
            evaluation_method=data.evaluation_method,
            performance_notes=data.performance_notes,
            general_notes=data.general_notes,
            status=STATUS_DRAFT,
            created_by_user_id=created_by_user_id,
        )
        self._db.add(record)
        await self._db.commit()
        await self._db.refresh(record)
        reloaded = await self.get(record.id)  # reload with relationships
        assert reloaded is not None
        return reloaded

    async def get(self, record_id: int) -> TrainingRecord | None:
        # populate_existing forces a fresh reload of relationships (participants)
        # for an already-identity-mapped record — selectin collections don't
        # reliably re-fire otherwise within a session that outlives one request.
        result = await self._db.execute(
            select(TrainingRecord)
            .where(TrainingRecord.id == record_id)
            .execution_options(populate_existing=True)
        )
        return result.scalar_one_or_none()

    async def list_records(self, calendar_event_id: int | None = None) -> list[TrainingRecord]:
        query = select(TrainingRecord).order_by(TrainingRecord.training_date.desc())
        if calendar_event_id is not None:
            query = query.where(TrainingRecord.calendar_event_id == calendar_event_id)
        result = await self._db.execute(query)
        return list(result.scalars().all())

    async def update(self, record_id: int, data: TrainingRecordUpdate) -> TrainingRecord | None:
        record = await self.get(record_id)
        if record is None:
            return None
        updates = data.model_dump(exclude_unset=True, exclude={"modules"})
        for field, value in updates.items():
            setattr(record, field, value)
        if data.modules is not None:
            record.modules_json = [m.model_dump() for m in data.modules]
        await self._db.commit()
        return await self.get(record_id)

    async def delete(self, record_id: int) -> None:
        record = await self.get(record_id)
        if record is None:
            return
        await self._db.delete(record)
        await self._db.commit()

    # ── Participants ─────────────────────────────────────────────────────────

    async def add_participant(
        self, record_id: int, data: ParticipantCreate
    ) -> TrainingParticipant:
        participant = TrainingParticipant(
            training_record_id=record_id,
            name=data.name,
            role_title=data.role_title,
            sector=data.sector,
            signing_token=generate_api_key(),
            token_expires_at=datetime.now(UTC) + timedelta(days=TOKEN_VALIDITY_DAYS),
        )
        self._db.add(participant)
        await self._db.commit()
        await self._db.refresh(participant)
        return participant

    async def remove_participant(self, record_id: int, participant_id: int) -> bool:
        participant = await self._get_participant(participant_id)
        if participant is None or participant.training_record_id != record_id:
            return False
        await self._db.delete(participant)
        await self._db.commit()
        return True

    async def _get_participant(self, participant_id: int) -> TrainingParticipant | None:
        result = await self._db.execute(
            select(TrainingParticipant).where(TrainingParticipant.id == participant_id)
        )
        return result.scalar_one_or_none()

    async def get_by_token(self, token: str) -> TrainingParticipant | None:
        result = await self._db.execute(
            select(TrainingParticipant).where(TrainingParticipant.signing_token == token)
        )
        return result.scalar_one_or_none()

    async def sign_by_token(
        self, token: str, data: PublicSignRequest, signer_ip: str | None
    ) -> TrainingParticipant | None:
        participant = await self.get_by_token(token)
        if participant is None:
            return None
        if datetime.now(UTC) > participant.token_expires_at.replace(tzinfo=UTC):
            raise ValueError("Signing link expired")
        if participant.signed_at is not None:
            raise ValueError("Already signed")

        signature_path = self._store_signature(
            participant.training_record_id,
            f"participant-{participant.id}.png",
            data.signature_data,
        )
        participant.name = data.name
        participant.role_title = data.role_title
        participant.sector = data.sector
        participant.confirmed_understanding = data.confirmed_understanding
        participant.signature_path = signature_path
        participant.signed_at = datetime.now(UTC)
        participant.signed_ip = signer_ip
        await self._db.commit()
        await self._maybe_complete(participant.training_record_id)
        await self._db.refresh(participant)
        return participant

    async def _maybe_complete(self, record_id: int) -> None:
        record = await self.get(record_id)
        if record is None or not record.participants:
            return
        all_signed = all(p.signed_at is not None for p in record.participants)
        if (
            all_signed
            and record.instructor_signed_at is not None
            and record.status != STATUS_COMPLETED
        ):
            record.status = STATUS_COMPLETED
            await self._db.commit()

    # ── Instructor / responsible sign-off (authenticated) ──────────────────────

    async def sign_instructor(self, record_id: int, signature_data: str) -> TrainingRecord | None:
        record = await self.get(record_id)
        if record is None:
            return None
        record.instructor_signature_path = self._store_signature(
            record_id, "instructor.png", signature_data
        )
        record.instructor_signed_at = datetime.now(UTC)
        await self._db.commit()
        await self._maybe_complete(record_id)
        return await self.get(record_id)

    async def sign_responsible(
        self, record_id: int, responsible_name: str, signature_data: str
    ) -> TrainingRecord | None:
        record = await self.get(record_id)
        if record is None:
            return None
        record.responsible_name = responsible_name
        record.responsible_signature_path = self._store_signature(
            record_id, "responsible.png", signature_data
        )
        record.responsible_signed_at = datetime.now(UTC)
        await self._db.commit()
        return await self.get(record_id)

    # ── Stats for list view ──────────────────────────────────────────────────

    async def participant_counts(self, record_id: int) -> tuple[int, int]:
        result = await self._db.execute(
            select(
                func.count(TrainingParticipant.id),
                func.count(TrainingParticipant.signed_at),
            ).where(TrainingParticipant.training_record_id == record_id)
        )
        total, signed = result.one()
        return total, signed
