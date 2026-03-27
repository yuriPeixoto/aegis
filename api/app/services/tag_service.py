from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.dependencies import DbSession
from app.models.tag import Tag


class TagService:
    def __init__(self, db: DbSession):
        self.db = db

    async def list_all(self) -> list[Tag]:
        result = await self.db.execute(select(Tag).order_by(Tag.name))
        return list(result.scalars().all())

    async def create(self, name: str, color: str, description: str | None = None) -> Tag:
        tag = Tag(name=name, color=color, description=description)
        self.db.add(tag)
        await self.db.flush()
        return tag

    async def update(
        self, tag_id: int, name: str | None = None, color: str | None = None, description: str | None = None
    ) -> Tag | None:
        tag = await self.db.get(Tag, tag_id)
        if not tag:
            return None

        if name is not None:
            tag.name = name
        if color is not None:
            tag.color = color
        if description is not None:
            tag.description = description

        await self.db.flush()
        return tag

    async def delete(self, tag_id: int) -> bool:
        tag = await self.db.get(Tag, tag_id)
        if not tag:
            return False
        await self.db.delete(tag)
        await self.db.flush()
        return True

    async def get_by_ids(self, tag_ids: list[int]) -> list[Tag]:
        if not tag_ids:
            return []
        result = await self.db.execute(select(Tag).where(Tag.id.in_(tag_ids)))
        return list(result.scalars().all())
