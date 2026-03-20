from __future__ import annotations

from fastapi import APIRouter, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.core.auth import CurrentUser
from app.core.dependencies import DbSession
from app.schemas.attachment import AttachmentResponse
from app.services.attachment_service import AttachmentService

router = APIRouter(tags=["attachments"])


@router.post(
    "/v1/tickets/{ticket_id}/attachments",
    response_model=AttachmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_attachment(
    ticket_id: int,
    file: UploadFile,
    db: DbSession,
    current_user: CurrentUser,
) -> AttachmentResponse:
    try:
        attachment = await AttachmentService(db).upload(ticket_id, file, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    return AttachmentResponse.model_validate(attachment)


@router.get(
    "/v1/tickets/{ticket_id}/attachments",
    response_model=list[AttachmentResponse],
)
async def list_attachments(
    ticket_id: int,
    db: DbSession,
    _: CurrentUser,
) -> list[AttachmentResponse]:
    attachments = await AttachmentService(db).list_attachments(ticket_id)
    return [AttachmentResponse.model_validate(a) for a in attachments]


@router.get("/v1/attachments/{attachment_id}/download")
async def download_attachment(
    attachment_id: int,
    db: DbSession,
    _: CurrentUser,
) -> FileResponse:
    service = AttachmentService(db)
    attachment = await service.get(attachment_id)
    if attachment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")

    file_path = service.resolve_path(attachment)
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found on disk")

    return FileResponse(
        path=str(file_path),
        media_type=attachment.content_type,
        filename=attachment.original_filename,
    )
