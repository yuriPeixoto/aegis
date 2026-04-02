import asyncio
import sys
from pathlib import Path
from sqlalchemy import select

# Certifique-se de que `app` seja importável
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import AsyncSessionLocal
from app.models.source import Source
from app.core.security import hash_api_key, generate_api_key
import secrets

async def seed_sources() -> None:
    async with AsyncSessionLocal() as db:
        # Verificar se a fonte 'aegis' existe
        result = await db.execute(select(Source).where(Source.slug == "aegis"))
        source = result.scalar_one_or_none()
        
        if source is None:
            print("Creating 'aegis' internal source...")
            plain_key = generate_api_key()
            webhook_secret = secrets.token_hex(32)
            source = Source(
                name="Aegis Internal",
                slug="aegis",
                api_key_hash=hash_api_key(plain_key),
                webhook_secret=webhook_secret,
                is_active=True
            )
            db.add(source)
            await db.commit()
            print(f"Source 'aegis' created with ID {source.id}")
            # Em um ambiente real, você salvaria a plain_key, 
            # mas para a fonte interna 'aegis' ela não é usada via API externa.
        else:
            print(f"Source 'aegis' already exists (ID: {source.id})")

if __name__ == "__main__":
    asyncio.run(seed_sources())
