from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.tag import Tag
from app.schemas.tag import TagCreate, TagUpdate


class TagService:
    @staticmethod
    async def list_tags(db: AsyncSession) -> list[Tag]:
        result = await db.execute(select(Tag).order_by(Tag.name))
        return list(result.scalars().all())

    @staticmethod
    async def get_tag(db: AsyncSession, tag_id: int) -> Tag:
        tag = await db.get(Tag, tag_id)
        if not tag:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tag not found"
            )
        return tag

    @staticmethod
    async def create_tag(db: AsyncSession, tag_in: TagCreate) -> Tag:
        # Check if name already exists
        existing = await db.execute(select(Tag).where(Tag.name == tag_in.name))
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tag with name '{tag_in.name}' already exists"
            )
        
        tag = Tag(**tag_in.model_dump())
        db.add(tag)
        await db.commit()
        await db.refresh(tag)
        return tag

    @staticmethod
    async def update_tag(db: AsyncSession, tag_id: int, tag_in: TagUpdate) -> Tag:
        tag = await TagService.get_tag(db, tag_id)
        
        update_data = tag_in.model_dump(exclude_unset=True)
        
        if "name" in update_data and update_data["name"] != tag.name:
            existing = await db.execute(select(Tag).where(Tag.name == update_data["name"]))
            if existing.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Tag with name '{update_data['name']}' already exists"
                )

        for field, value in update_data.items():
            setattr(tag, field, value)
            
        await db.commit()
        await db.refresh(tag)
        return tag

    @staticmethod
    async def delete_tag(db: AsyncSession, tag_id: int) -> None:
        tag = await TagService.get_tag(db, tag_id)
        await db.delete(tag)
        await db.commit()
