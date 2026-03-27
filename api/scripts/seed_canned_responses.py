import asyncio
import sys
import os

# Adiciona o diretório api ao sys.path para importações da app funcionarem
sys.path.append(os.path.join(os.getcwd(), "api"))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.models.canned_response import CannedResponse
from app.services.canned_response_service import CannedResponseService
from app.schemas.canned_response import CannedResponseCreate, CannedResponseActions

async def seed_responses():
    async with AsyncSessionLocal() as db:
        # 1. Obter um usuário admin ou o primeiro usuário ativo para associar a resposta
        result = await db.execute(select(User).where(User.is_active == True).order_by(User.role == 'admin', User.id))
        user = result.scalars().first()
        
        if not user:
            print("Nenhum usuário ativo encontrado no banco. Por favor, crie um usuário primeiro.")
            return

        print(f"Usando usuário: {user.name} (ID: {user.id}) para as respostas prontas.")
        
        svc = CannedResponseService(db)
        
        # 2. Definir as respostas prontas baseadas nos cenários do sistema de gestão de frotas
        responses = [
            {
                "title": "Agradecimento e Fechamento (Dúvida Sanada)",
                "body": "Olá {{ticket.requester.name}},\n\nFicamos felizes em saber que sua dúvida sobre o ticket {{ticket.external_id}} foi resolvida. Estamos encerrando este chamado agora.\n\nQualquer outra necessidade, não hesite em nos contatar.\n\nAtenciosamente,\n{{user.name}}",
                "actions": CannedResponseActions(status="closed")
            },
            {
                "title": "Bug Report - Encaminhado para Desenvolvimento",
                "body": "Olá {{ticket.requester.name}},\n\nAgradecemos por reportar o problema: \"{{ticket.subject}}\".\n\nNossa equipe técnica já foi notificada e o erro foi encaminhado para o departamento de desenvolvimento. Manteremos você informado sobre a resolução no ticket {{ticket.external_id}}.\n\nAtenciosamente,\n{{user.name}}",
                "actions": CannedResponseActions(status="in_progress", priority="high")
            },
            {
                "title": "Solicitação de Logs/Evidências",
                "body": "Olá {{ticket.requester.name}},\n\nPara analisarmos melhor o ocorrido no chamado {{ticket.external_id}}, por favor, poderia nos enviar os logs do servidor ou prints/vídeos da tela no momento do erro?\n\nIsso nos ajudará a identificar a causa raiz mais rapidamente.\n\nAguardamos seu retorno.",
                "actions": CannedResponseActions(status="waiting_client")
            },
            {
                "title": "Confirmação de Recebimento",
                "body": "Olá {{ticket.requester.name}},\n\nRecebemos seu chamado referente a \"{{ticket.subject}}\" (ID: {{ticket.external_id}}). Nossa equipe já está analisando as informações e em breve daremos um retorno detalhado.\n\nObrigado pela paciência.",
                "actions": CannedResponseActions(status="open")
            },
            {
                "title": "Ticket Fechado por Inatividade",
                "body": "Olá {{ticket.requester.name}},\n\nComo não tivemos retorno nas últimas interações, estamos encerrando o ticket {{ticket.external_id}} por falta de atividade. \n\nCaso o problema persista, você pode reabri-lo ou criar um novo chamado.\n\nAtenciosamente,\nEquipe Aegis",
                "actions": CannedResponseActions(status="closed")
            },
            {
                "title": "Checklist - Erro de Configuração",
                "body": "Olá {{ticket.requester.name}},\n\nIdentificamos que o erro relatado no checklist ocorre devido a uma divergência na configuração do tipo de pergunta. \n\nEstamos ajustando as permissões e as configurações da filial para garantir que os dados sejam exibidos corretamente. Favor testar novamente em 15 minutos.\n\nAtenciosamente,\n{{user.name}}",
                "actions": CannedResponseActions(status="in_progress", priority="medium")
            }
        ]
        
        # 3. Inserir as respostas no banco
        for resp in responses:
            # Verificar se já existe uma resposta com o mesmo título para evitar duplicatas
            existing = await db.execute(select(CannedResponse).where(CannedResponse.title == resp["title"]))
            if existing.scalars().first():
                print(f"Resposta '{resp['title']}' já existe. Pulando...")
                continue
                
            create_schema = CannedResponseCreate(
                title=resp["title"],
                body=resp["body"],
                actions=resp["actions"]
            )
            await svc.create_response(create_schema, user.id)
            print(f"Resposta '{resp['title']}' criada com sucesso.")

if __name__ == "__main__":
    asyncio.run(seed_responses())
