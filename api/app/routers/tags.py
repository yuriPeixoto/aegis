from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy.exc import IntegrityError

from app.core.auth import AdminUser, CurrentUser
from app.core.dependencies import DbSession
from app.schemas.tag import TagCreate, TagResponse, TagUpdate
from app.services.tag_service import TagService

router = APIRouter(prefix="/v1/tags", tags=["tags"])


@router.get("", response_model=list[TagResponse])
async def list_tags(db: DbSession, _: CurrentUser) -> list[TagResponse]:
    tags = await TagService(db).list_all()
    return [TagResponse.model_validate(t) for t in tags]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=TagResponse)
async def create_tag(
    data: TagCreate, db: DbSession, _: AdminUser
) -> TagResponse:
    try:
        tag = await TagService(db).create(
            name=data.name,
            color=data.color,
            description=data.description,
        )
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Tag with name '{data.name}' already exists",
        )
    return TagResponse.model_validate(tag)


@router.patch("/{tag_id}", response_model=TagResponse)
async def update_tag(
    tag_id: int, data: TagUpdate, db: DbSession, _: AdminUser
) -> TagResponse:
    try:
        tag = await TagService(db).update(
            tag_id,
            name=data.name,
            color=data.color,
            description=data.description,
        )
        if tag is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Another tag with this name already exists",
        )
    return TagResponse.model_validate(tag)


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(tag_id: int, db: DbSession, _: AdminUser) -> None:
    success = await TagService(db).delete(tag_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
    await db.commit()
