import asyncio
import argparse
import sys
import os

# Add api directory to sys.path
sys.path.append(os.path.join(os.getcwd(), "api"))

from app.core.database import AsyncSessionLocal
from app.services.auto_close_service import AutoCloseService

async def main():
    parser = argparse.ArgumentParser(description="Run Aegis Auto-close process.")
    parser.add_argument("--dry-run", action="store_true", help="Don't commit changes")
    args = parser.parse_args()

    async with AsyncSessionLocal() as db:
        service = AutoCloseService(db)
        print("Starting auto-close process...")
        results = await service.process_auto_close()
        print(f"Process finished: {results['closed']} closed, {results['warned']} warned.")
        
        if args.dry_run:
            print("Dry run: rolling back changes.")
            await db.rollback()
        else:
            await db.commit()

if __name__ == "__main__":
    asyncio.run(main())
