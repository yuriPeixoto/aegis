"""
Update the first user in the database to the admin account.
Run from the api/ directory:
    py -3.14 scripts/seed_admin.py
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

# Make sure `app` is importable when running this script directly
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, update

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.user import User


async def main() -> None:
    async with AsyncSessionLocal() as db:
        # Find the user with the lowest id
        result = await db.execute(select(User).order_by(User.id).limit(1))
        user = result.scalar_one_or_none()

        if user is None:
            print("No users found. Creating admin user...")
            user = User(
                email="yuripeixoto@gmail.com",
                password_hash=hash_password("08051987"),
                name="Yuri Peixoto",
                is_active=True,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        else:
            print(f"Updating user id={user.id} ({user.email}) -> yuripeixoto@gmail.com")
            await db.execute(
                update(User)
                .where(User.id == user.id)
                .values(
                    email="yuripeixoto@gmail.com",
                    password_hash=hash_password("08051987"),
                    name="Yuri Peixoto",
                    is_active=True,
                )
            )
            await db.commit()

        print(f"Done. User id={user.id} | email=yuripeixoto@gmail.com | name=Yuri Peixoto")


if __name__ == "__main__":
    asyncio.run(main())
