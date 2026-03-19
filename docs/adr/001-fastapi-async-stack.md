# ADR-001: FastAPI + SQLAlchemy 2.0 Async como stack backend

**Status:** Accepted
**Date:** 2026-03-18

## Context

Aegis precisa processar webhooks de múltiplas instâncias do gestão frota simultaneamente, servir um inbox em tempo real e, no futuro, calcular SLA e enviar notificações. A equipe Unitop é pequena — a stack deve ser produtiva sem cerimônia.

## Decision

Usar **FastAPI** com **SQLAlchemy 2.0 async** (`asyncpg`) e **PostgreSQL**.

- FastAPI: tipagem nativa via Pydantic, documentação Swagger automática (`/docs`), performance de I/O não-bloqueante
- SQLAlchemy 2.0 async: ORM maduro com suporte a `AsyncSession`, queries expressivas, migrações via Alembic
- asyncpg: driver PostgreSQL nativo async, mais rápido que psycopg2 em cargas concorrentes
- PostgreSQL: JSONB para `source_metadata` sem schema rígido, índices parciais, full-text search futuro

## Consequences

- **Positivo:** Alta throughput para ingest de webhooks; tipagem end-to-end (Pydantic → TypeScript via schema); dev experience rápida
- **Negativo:** Async requer atenção com session lifecycle — usar `NullPool` em testes para evitar conflito de event loop
- **Lição aprendida:** Testes com `AsyncSession` devem usar fixture com `NullPool` separado do pool de produção; nunca reutilizar `AsyncSessionLocal` em contexto de teste

## Alternatives Considered

- Django + DRF: mais batteries-included mas síncrono por padrão; overhead para uma API pequena
- Node.js/Express: familiaridade menor na equipe; ecossistema mais fragmentado para APIs tipadas
