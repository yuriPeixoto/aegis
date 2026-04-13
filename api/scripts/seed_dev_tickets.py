"""
Seed script for local development — inserts realistic tickets for users 1 and 12.

Usage (from api/ directory):
    python scripts/seed_dev_tickets.py

Requires the same .env used by the API (AEGIS_DATABASE_URL).
"""

import asyncio
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import asyncpg
from app.core.config import settings

# ── Config ────────────────────────────────────────────────────────────────────

USER_IDS   = [1, 12]
SOURCE_IDS = [1, 74, 75]
NOW        = datetime.now(timezone.utc)

STATUSES_ACTIVE   = ['open', 'in_progress', 'waiting_client', 'waiting_dev']
STATUSES_TERMINAL = ['resolved', 'closed', 'pending_closure']
PRIORITIES        = ['urgent', 'high', 'medium', 'low']
TYPES             = ['bug', 'improvement', 'question', 'support']

SUBJECTS = [
    "Relatório de quilometragem não carrega",
    "Erro ao registrar abastecimento",
    "Mapa de rastreamento travando no Firefox",
    "Notificação de manutenção não enviada",
    "Exportação de PDF com dados incorretos",
    "Botão de confirmar rota desaparece na mobile",
    "Integração com sistema de ponto falhando",
    "Dashboard de custos mostrando valores negativos",
    "Filtro de data não funciona para datas anteriores a 2024",
    "Usuário não consegue alterar senha",
    "Módulo de frotas duplicando registros",
    "Alerta de revisão programada não dispara",
    "Importação de planilha de veículos trava no step 3",
    "Relatório mensal travando para bases acima de 500 registros",
    "Erro 500 ao salvar configuração de rota automatizada",
    "Permissão de gestor não aplica ao módulo de abastecimento",
    "Solicito melhoria: filtro por motorista no relatório de ocorrências",
    "Dúvida: como configurar alertas de velocidade por trecho?",
    "Integração com telemetria parando após atualização",
    "Tela de login lenta no iOS 17",
    "Cálculo de horas extras inconsistente para turnos noturnos",
    "Suporte: como exportar dados históricos de mais de 1 ano?",
    "Crash ao abrir detalhamento de viagem longa acima de 8h",
    "Solicito campo de observações no cadastro de veículo",
    "Problema com fuso horário nos logs de jornada",
    "Relatório de infrações não agrupa por tipo corretamente",
    "Erro de validação ao cadastrar CNH categoria E",
    "Performance do módulo de escalas degradou após atualização",
    "Melhoria: exportar checklist de vistoria em PDF",
    "Dúvida sobre cálculo de SLA no contrato premium",
]

# ── Helpers ───────────────────────────────────────────────────────────────────

def rand_date(days_ago_max: int, days_ago_min: int = 0) -> datetime:
    offset = random.randint(days_ago_min * 86400, days_ago_max * 86400)
    return NOW - timedelta(seconds=offset)


def make_external_id(i: int) -> str:
    return f"SUP-2026-{str(i).zfill(4)}"


def build_tickets(start_index: int = 1000) -> list[dict]:
    tickets = []
    idx = start_index
    random.seed(42)  # reproducible

    for _ in range(60):
        idx += 1
        created = rand_date(60, 1)
        user_id = random.choice(USER_IDS)
        source_id = random.choice(SOURCE_IDS)
        priority = random.choice(PRIORITIES)
        ttype = random.choice(TYPES)
        subject = random.choice(SUBJECTS)

        if random.random() < 0.55:
            status = random.choice(STATUSES_TERMINAL)
            resolved_at = created + timedelta(hours=random.randint(1, 72))
            if resolved_at > NOW:
                resolved_at = NOW - timedelta(hours=1)
            csat = random.choice([None, None, 3, 4, 4, 5, 5, 5]) if status in ('resolved', 'closed') else None
            csat_submitted_at = (resolved_at + timedelta(hours=random.randint(2, 48))) if csat else None
        else:
            status = random.choice(STATUSES_ACTIVE)
            resolved_at = None
            csat = None
            csat_submitted_at = None

        tickets.append({
            'external_id': make_external_id(idx),
            'source_id': source_id,
            'type': ttype,
            'priority': priority,
            'status': status,
            'subject': subject,
            'description': f"Descrição detalhada do chamado {make_external_id(idx)}.",
            'assigned_to_user_id': user_id,
            'first_ingested_at': created,
            'last_synced_at': resolved_at or created + timedelta(hours=random.randint(0, 5)),
            'resolved_at': resolved_at,
            'csat_rating': csat,
            'csat_submitted_at': csat_submitted_at,
            'source_created_at': created,
            'source_updated_at': resolved_at or created,
        })

    return tickets


INSERT_SQL = """
INSERT INTO tickets (
    external_id, source_id, type, priority, status, subject, description,
    assigned_to_user_id, first_ingested_at, last_synced_at, resolved_at,
    csat_rating, csat_submitted_at, source_created_at, source_updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
)
ON CONFLICT (source_id, external_id) DO NOTHING
"""


async def main() -> None:
    db_url = settings.database_url.replace("postgresql+asyncpg://", "postgresql://")
    print(f"Connecting to: {db_url[:45]}...")

    conn = await asyncpg.connect(db_url)
    tickets = build_tickets()
    inserted = 0

    for t in tickets:
        result = await conn.execute(
            INSERT_SQL,
            t['external_id'], t['source_id'], t['type'], t['priority'],
            t['status'], t['subject'], t['description'], t['assigned_to_user_id'],
            t['first_ingested_at'], t['last_synced_at'], t['resolved_at'],
            t['csat_rating'], t['csat_submitted_at'],
            t['source_created_at'], t['source_updated_at'],
        )
        if result != 'INSERT 0 0':
            inserted += 1

    await conn.close()

    print(f"Done. {inserted}/{len(tickets)} tickets inserted.")
    print(f"  Users: {USER_IDS}")
    print(f"  Sources: {SOURCE_IDS}")
    print(f"  Period: last 60 days")
    by_user = {}
    for t in tickets:
        by_user.setdefault(t['assigned_to_user_id'], 0)
        by_user[t['assigned_to_user_id']] += 1
    for uid, count in by_user.items():
        print(f"  User {uid}: {count} tickets")


if __name__ == "__main__":
    asyncio.run(main())
