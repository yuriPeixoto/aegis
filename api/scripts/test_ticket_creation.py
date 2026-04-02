import asyncio
import sys
from pathlib import Path

# Certifique-se de que `app` seja importável
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import AsyncSessionLocal
from app.services.ticket_service import TicketService
from app.services.user_service import UserService
from sqlalchemy import select
from app.models.user import User

async def test_create_internal_ticket() -> None:
    async with AsyncSessionLocal() as db:
        # 1. Obter um usuário para ser o relator
        result = await db.execute(select(User).limit(1))
        user = result.scalar_one_or_none()
        
        if user is None:
            print("Nenhum usuário encontrado para o teste.")
            return
            
        print(f"Testando criação de ticket para o usuário: {user.email}")
        
        # 2. Tentar criar o ticket interno
        service = TicketService(db)
        try:
            ticket = await service.create_internal_ticket(
                subject="Teste de Ticket Interno",
                description="Esta é uma descrição de teste para validar a correção.",
                type="bug",
                priority="high",
                user_id=user.id
            )
            print(f"SUCESSO: Ticket criado com ID {ticket.id}, External ID {ticket.external_id}")
            print(f"Source: {ticket.source.name} (Slug: {ticket.source.slug})")
        except Exception as e:
            print(f"FALHA: Erro ao criar ticket: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_create_internal_ticket())
