from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from sqlalchemy.exc import IntegrityError

from app.core.auth import AdminUser, CurrentUser
from app.core.config import settings
from app.core.dependencies import DbSession
from app.schemas.source import (
    SourceCreate,
    SourceCreatedResponse,
    SourceKeyRegeneratedResponse,
    SourceResponse,
    SourceUpdate,
)
from app.services.source_service import SourceService

_LOGO_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/svg+xml"}
_LOGO_MAX_BYTES = 5 * 1024 * 1024  # 5 MB

router = APIRouter(prefix="/v1/sources", tags=["sources"])


@router.post("", status_code=status.HTTP_201_CREATED, response_model=SourceCreatedResponse)
async def create_source(data: SourceCreate, db: DbSession, _: AdminUser) -> SourceCreatedResponse:
    """Register a new source. Returns the API key — store it securely, it won't be shown again."""
    try:
        source, plain_key, webhook_secret = await SourceService(db).create(data)
    except IntegrityError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A source with slug '{data.slug}' already exists",
        ) from exc
    return SourceCreatedResponse(
        id=source.id,
        name=source.name,
        slug=source.slug,
        is_active=source.is_active,
        created_at=source.created_at,
        api_key=plain_key,
        webhook_secret=webhook_secret,
    )


@router.get("", response_model=list[SourceResponse])
async def list_sources(db: DbSession, _: CurrentUser) -> list[SourceResponse]:
    sources = await SourceService(db).list_all()
    return [SourceResponse.model_validate(s) for s in sources]


@router.patch("/{source_id}", response_model=SourceResponse)
async def update_source(
    source_id: int, data: SourceUpdate, db: DbSession, _: AdminUser
) -> SourceResponse:
    source = await SourceService(db).update(source_id, data)
    if source is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found")
    return SourceResponse.model_validate(source)


@router.post("/{source_id}/logo", response_model=SourceResponse)
async def upload_source_logo(
    source_id: int, db: DbSession, _: AdminUser, logo: UploadFile = File(...)
) -> SourceResponse:
    content_type = logo.content_type or ""
    if content_type not in _LOGO_ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Logo must be JPEG, PNG, WebP, or SVG",
        )
    content = await logo.read()
    if len(content) > _LOGO_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Logo file too large (max 5 MB)",
        )
    suffix = Path(logo.filename or "").suffix.lower() or ".png"
    logo_filename = f"{uuid.uuid4().hex}{suffix}"
    logo_dir = Path(settings.upload_dir) / "logos"
    logo_dir.mkdir(parents=True, exist_ok=True)
    (logo_dir / logo_filename).write_bytes(content)

    source = await SourceService(db).update_logo(source_id, logo_filename)
    if source is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found")
    return SourceResponse.model_validate(source)


@router.post("/{source_id}/regenerate-key", response_model=SourceKeyRegeneratedResponse)
async def regenerate_source_key(
    source_id: int, db: DbSession, _: AdminUser
) -> SourceKeyRegeneratedResponse:
    result = await SourceService(db).regenerate_key(source_id)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found")
    _source, plain_key, webhook_secret = result
    return SourceKeyRegeneratedResponse(api_key=plain_key, webhook_secret=webhook_secret)
