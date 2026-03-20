from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password
from app.models.user import User


class UserService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create(
        self,
        email: str,
        password: str,
        name: str,
        role: str = "agent",
        must_change_password: bool = True,
    ) -> User:
        user = User(
            email=email,
            password_hash=hash_password(password),
            name=name,
            role=role,
            must_change_password=must_change_password,
        )
        self._db.add(user)
        await self._db.commit()
        await self._db.refresh(user)
        return user

    async def update(
        self,
        user_id: int,
        role: str | None = None,
        is_active: bool | None = None,
    ) -> User | None:
        user = await self.get_by_id_any(user_id)
        if user is None:
            return None
        if role is not None:
            user.role = role
        if is_active is not None:
            user.is_active = is_active
        await self._db.commit()
        await self._db.refresh(user)
        return user

    async def change_password(self, user_id: int, new_password: str) -> User | None:
        user = await self.get_by_id(user_id)
        if user is None:
            return None
        user.password_hash = hash_password(new_password)
        user.must_change_password = False
        await self._db.commit()
        await self._db.refresh(user)
        return user

    async def authenticate(self, email: str, password: str) -> User | None:
        result = await self._db.execute(
            select(User).where(User.email == email, User.is_active.is_(True))
        )
        user = result.scalar_one_or_none()
        if user is None or not verify_password(password, user.password_hash):
            return None
        return user

    async def get_by_id(self, user_id: int) -> User | None:
        result = await self._db.execute(
            select(User).where(User.id == user_id, User.is_active.is_(True))
        )
        return result.scalar_one_or_none()

    async def get_by_id_any(self, user_id: int) -> User | None:
        """Get user regardless of active status — used for admin operations."""
        result = await self._db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def list_all(self) -> list[User]:
        """Return all users — used for admin management."""
        result = await self._db.execute(select(User).order_by(User.name))
        return list(result.scalars().all())

    async def list_agents(self) -> list[User]:
        """Return all active users with role admin or agent (assignable)."""
        result = await self._db.execute(
            select(User)
            .where(User.is_active.is_(True), User.role.in_(["admin", "agent"]))
            .order_by(User.name)
        )
        return list(result.scalars().all())
