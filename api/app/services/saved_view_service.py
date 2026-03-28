from __future__ import annotations

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.saved_view import SavedView
from app.schemas.saved_view import SavedViewCreate, SavedViewUpdate


class SavedViewService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def list_for_user(self, user_id: int) -> list[SavedView]:
        """Return shared views + this user's personal views, ordered by position."""
        result = await self._db.execute(
            select(SavedView)
            .where(
                or_(
                    SavedView.is_shared.is_(True),
                    SavedView.user_id == user_id,
                )
            )
            .order_by(SavedView.position, SavedView.created_at)
        )
        return list(result.scalars().all())

    async def get(self, view_id: int) -> SavedView | None:
        result = await self._db.execute(
            select(SavedView).where(SavedView.id == view_id)
        )
        return result.scalar_one_or_none()

    async def create(self, user_id: int, data: SavedViewCreate) -> SavedView:
        view = SavedView(
            name=data.name,
            icon=data.icon,
            user_id=user_id,
            is_shared=data.is_shared,
            filters=data.filters,
            position=data.position,
        )
        self._db.add(view)
        await self._db.commit()
        await self._db.refresh(view)
        return view

    async def update(
        self, view_id: int, user_id: int, is_admin: bool, data: SavedViewUpdate
    ) -> SavedView | None:
        view = await self.get(view_id)
        if view is None:
            return None
        # Only owner or admin may edit
        if view.user_id != user_id and not is_admin:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(view, field, value)
        await self._db.commit()
        await self._db.refresh(view)
        return view

    async def delete(self, view_id: int, user_id: int, is_admin: bool) -> bool:
        view = await self.get(view_id)
        if view is None:
            return False
        if view.user_id != user_id and not is_admin:
            return False
        await self._db.delete(view)
        await self._db.commit()
        return True
