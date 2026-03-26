from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy.exc import IntegrityError

from app.core.auth import AdminUser
from app.core.dependencies import DbSession
from app.schemas.source import SourceCreate, SourceCreatedResponse, SourceKeyRegeneratedResponse, SourceResponse, SourceUpdate
from app.services.source_service import SourceService

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
async def list_sources(db: DbSession, _: AdminUser) -> list[SourceResponse]:
    sources = await SourceService(db).list_all()
    return [SourceResponse.model_validate(s) for s in sources]


@router.patch("/{source_id}", response_model=SourceResponse)
async def update_source(source_id: int, data: SourceUpdate, db: DbSession, _: AdminUser) -> SourceResponse:
    source = await SourceService(db).update(source_id, data)
    if source is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found")
    return SourceResponse.model_validate(source)


@router.post("/{source_id}/regenerate-key", response_model=SourceKeyRegeneratedResponse)
async def regenerate_source_key(source_id: int, db: DbSession, _: AdminUser) -> SourceKeyRegeneratedResponse:
    result = await SourceService(db).regenerate_key(source_id)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found")
    _, plain_key, webhook_secret = result
    return SourceKeyRegeneratedResponse(api_key=plain_key, webhook_secret=webhook_secret)
