import secrets
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import generate_api_key, hash_api_key, verify_api_key
from app.models.source import Source
from app.schemas.source import SourceCreate, SourceUpdate


class SourceService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create(self, data: SourceCreate) -> tuple[Source, str, str]:
        """Create a source and return (source, plaintext_api_key, webhook_secret)."""
        plain_key = generate_api_key()
        webhook_secret = secrets.token_hex(32)
        source = Source(
            name=data.name,
            slug=data.slug,
            api_key_hash=hash_api_key(plain_key),
            webhook_secret=webhook_secret,
        )
        self._db.add(source)
        await self._db.commit()
        await self._db.refresh(source)
        return source, plain_key, webhook_secret

    async def get_by_id(self, source_id: int) -> Source | None:
        result = await self._db.execute(select(Source).where(Source.id == source_id))
        return result.scalar_one_or_none()

    async def update(self, source_id: int, data: SourceUpdate) -> Source | None:
        source = await self.get_by_id(source_id)
        if source is None:
            return None
        if data.name is not None:
            source.name = data.name
        if data.is_active is not None:
            source.is_active = data.is_active
        if data.webhook_url is not None:
            source.webhook_url = data.webhook_url or None  # empty string → NULL
        if data.webhook_url_internal is not None:
            source.webhook_url_internal = data.webhook_url_internal or None  # empty string → NULL
        await self._db.commit()
        await self._db.refresh(source)
        return source

    async def regenerate_key(self, source_id: int) -> tuple[Source, str, str] | None:
        source = await self.get_by_id(source_id)
        if source is None:
            return None
        plain_key = generate_api_key()
        webhook_secret = secrets.token_hex(32)
        source.api_key_hash = hash_api_key(plain_key)
        source.webhook_secret = webhook_secret
        await self._db.commit()
        await self._db.refresh(source)
        return source, plain_key, webhook_secret

    async def list_all(self) -> list[Source]:
        result = await self._db.execute(select(Source).order_by(Source.created_at.desc()))
        return list(result.scalars().all())

    async def get_by_api_key(self, plain_key: str) -> Source | None:
        """Validate an API key and return the active source, or None."""
        result = await self._db.execute(select(Source).where(Source.is_active.is_(True)))
        for source in result.scalars().all():
            if verify_api_key(plain_key, source.api_key_hash):
                return source
        return None
