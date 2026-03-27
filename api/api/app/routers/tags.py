from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user, require_admin
from app.core.database import get_db
from app.models.user import User
from app.schemas.tag import TagCreate, TagUpdate, TagResponse
from app.services.tag_service import TagService

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("/", response_model=list[TagResponse])
async def list_tags(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all available tags."""
    return await TagService.list_tags(db)


@router.post("/", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def create_tag(
    tag_in: TagCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Create a new tag (Admin only)."""
    return await TagService.create_tag(db, tag_in)


@router.patch("/{tag_id}", response_model=TagResponse)
async def update_tag(
    tag_id: int,
    tag_in: TagUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Update a tag (Admin only)."""
    return await TagService.update_tag(db, tag_id, tag_in)


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    tag_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Delete a tag (Admin only)."""
    await TagService.delete_tag(db, tag_id)
