from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Request, Response, status

from app.core.auth import CurrentUser
from app.core.dependencies import DbSession
from app.schemas.training_record import (
    ParticipantCreate,
    ParticipantResponse,
    PublicSignRequest,
    PublicTrainingSummary,
    SignInstructorRequest,
    SignResponsibleRequest,
    TrainingRecordCreate,
    TrainingRecordListItem,
    TrainingRecordResponse,
    TrainingRecordUpdate,
)
from app.services.training_pdf_service import TrainingPdfService
from app.services.training_record_service import TrainingRecordService

router = APIRouter(prefix="/v1/training-records", tags=["training-records"])
public_router = APIRouter(prefix="/v1/public/training-sign", tags=["training-records-public"])


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


# ── Authenticated CRUD ───────────────────────────────────────────────────────


@router.get("", response_model=list[TrainingRecordListItem])
async def list_training_records(
    db: DbSession,
    _: CurrentUser,
    calendar_event_id: int | None = Query(default=None),
) -> list[TrainingRecordListItem]:
    svc = TrainingRecordService(db)
    records = await svc.list_records(calendar_event_id=calendar_event_id)
    items = []
    for r in records:
        total = len(r.participants)
        signed = sum(1 for p in r.participants if p.signed_at is not None)
        items.append(
            TrainingRecordListItem(
                id=r.id,
                training_name=r.training_name,
                training_date=r.training_date,
                modality=r.modality,
                status=r.status,
                source=r.source,
                instructor=r.instructor,
                participant_count=total,
                signed_count=signed,
            )
        )
    return items


@router.post("", response_model=TrainingRecordResponse, status_code=status.HTTP_201_CREATED)
async def create_training_record(
    data: TrainingRecordCreate, db: DbSession, current_user: CurrentUser
) -> TrainingRecordResponse:
    record = await TrainingRecordService(db).create(data, created_by_user_id=current_user.id)
    return TrainingRecordResponse.model_validate(record)


@router.get("/{record_id}", response_model=TrainingRecordResponse)
async def get_training_record(
    record_id: int, db: DbSession, _: CurrentUser
) -> TrainingRecordResponse:
    record = await TrainingRecordService(db).get(record_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    return TrainingRecordResponse.model_validate(record)


@router.patch("/{record_id}", response_model=TrainingRecordResponse)
async def update_training_record(
    record_id: int, data: TrainingRecordUpdate, db: DbSession, _: CurrentUser
) -> TrainingRecordResponse:
    record = await TrainingRecordService(db).update(record_id, data)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    return TrainingRecordResponse.model_validate(record)


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_training_record(record_id: int, db: DbSession, _: CurrentUser) -> None:
    await TrainingRecordService(db).delete(record_id)


@router.get("/{record_id}/pdf")
async def get_training_record_pdf(record_id: int, db: DbSession, _: CurrentUser) -> Response:
    svc = TrainingRecordService(db)
    record = await svc.get(record_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    pdf_bytes = TrainingPdfService(svc).render(record)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="treinamento-{record_id}.pdf"',
        },
    )


# ── Participants ─────────────────────────────────────────────────────────────


@router.post(
    "/{record_id}/participants",
    response_model=ParticipantResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_participant(
    record_id: int, data: ParticipantCreate, db: DbSession, _: CurrentUser
) -> ParticipantResponse:
    svc = TrainingRecordService(db)
    if await svc.get(record_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    participant = await svc.add_participant(record_id, data)
    return ParticipantResponse.model_validate(participant)


@router.delete("/{record_id}/participants/{participant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_participant(
    record_id: int, participant_id: int, db: DbSession, _: CurrentUser
) -> None:
    removed = await TrainingRecordService(db).remove_participant(record_id, participant_id)
    if not removed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Participant not found")


# ── Instructor / responsible sign-off ───────────────────────────────────────


@router.post("/{record_id}/sign-instructor", response_model=TrainingRecordResponse)
async def sign_instructor(
    record_id: int, data: SignInstructorRequest, db: DbSession, _: CurrentUser
) -> TrainingRecordResponse:
    record = await TrainingRecordService(db).sign_instructor(record_id, data.signature_data)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    return TrainingRecordResponse.model_validate(record)


@router.post("/{record_id}/sign-responsible", response_model=TrainingRecordResponse)
async def sign_responsible(
    record_id: int, data: SignResponsibleRequest, db: DbSession, _: CurrentUser
) -> TrainingRecordResponse:
    record = await TrainingRecordService(db).sign_responsible(
        record_id, data.responsible_name, data.signature_data
    )
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    return TrainingRecordResponse.model_validate(record)


# ── Public signing (unauthenticated, token-scoped) ─────────────────────────────


@public_router.get("/{token}", response_model=PublicTrainingSummary)
async def get_public_summary(token: str, db: DbSession) -> PublicTrainingSummary:
    svc = TrainingRecordService(db)
    participant = await svc.get_by_token(token)
    if participant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")

    record = await svc.get(participant.training_record_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")

    return PublicTrainingSummary(
        training_name=record.training_name,
        system_module=record.system_module,
        training_date=record.training_date,
        start_time=record.start_time,
        end_time=record.end_time,
        workload_hours=record.workload_hours,
        modality=record.modality,
        instructor_name=record.instructor.name,
        source_name=record.source.name if record.source else None,
        participant_name=participant.name,
        participant_role_title=participant.role_title,
        participant_sector=participant.sector,
        already_signed=participant.signed_at is not None,
    )


@public_router.post("/{token}", status_code=status.HTTP_204_NO_CONTENT)
async def sign_public(
    token: str, data: PublicSignRequest, db: DbSession, request: Request
) -> None:
    svc = TrainingRecordService(db)
    try:
        participant = await svc.sign_by_token(token, data, signer_ip=_client_ip(request))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e)) from e
    if participant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")
