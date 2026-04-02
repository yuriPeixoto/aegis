import asyncio
import sys
from pathlib import Path
from sqlalchemy import select

# Make sure `app` is importable
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import AsyncSessionLocal
from app.models.source import Source

async def main() -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Source).where(Source.slug == "aegis"))
        source = result.scalar_one_or_none()
        if source:
            print(f"FOUND: ID={source.id}, Name={source.name}, Slug={source.slug}")
        else:
            print("NOT_FOUND")

if __name__ == "__main__":
    asyncio.run(main())
