from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy.exc import IntegrityError

from app.core.dependencies import DbSession
from app.schemas.source import SourceCreate, SourceCreatedResponse, SourceResponse
from app.services.source_service import SourceService

router = APIRouter(prefix="/v1/sources", tags=["sources"])


@router.post("", status_code=status.HTTP_201_CREATED, response_model=SourceCreatedResponse)
async def create_source(data: SourceCreate, db: DbSession) -> SourceCreatedResponse:
    """Register a new source. Returns the API key — store it securely, it won't be shown again."""
    try:
        source, plain_key = await SourceService(db).create(data)
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
    )


@router.get("", response_model=list[SourceResponse])
async def list_sources(db: DbSession) -> list[SourceResponse]:
    sources = await SourceService(db).list_all()
    return [SourceResponse.model_validate(s) for s in sources]
