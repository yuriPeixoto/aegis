# ADR-002: Autenticação por API Key para sources, JWT para usuários

**Status:** Accepted
**Date:** 2026-03-18

## Context

Dois tipos de cliente precisam autenticar no Aegis:

1. **Sistemas externos** (gestão frota, futuros) — enviam webhooks via ingest
2. **Usuários humanos** (Equipe Unitop) — acessam o inbox via frontend

## Decision

- **Sources (sistemas externos):** API Key estática por instância, enviada no header `X-Aegis-Key`. A chave é gerada uma única vez no cadastro da source (`POST /v1/sources`) e armazenada como hash (`sha256:salt`). A plain key nunca é recuperável — se perdida, uma nova source deve ser criada.
- **Usuários:** JWT Bearer token com expiração de 24h. Login via `POST /v1/auth/login`, token armazenado em `localStorage` no frontend.

### Por que API Key e não OAuth2 para sources?

Sources são sistemas server-to-server sem usuário humano na ponta. OAuth2 Client Credentials adicionaria complexidade sem benefício real neste estágio. API Key estática é simples, auditável via `slug` da source, e suficientemente segura com HTTPS.

## Consequences

- **Positivo:** Separação clara de contextos de auth; sources isoladas por instância (Carvalima tem sua key, Frigonorte terá a sua)
- **Negativo:** Rotação de API Key requer criar nova source e atualizar `.env` do sistema externo
- **Lição aprendida:** A plain key deve ser exibida **uma única vez** na resposta de criação da source — documentar isso claramente para o operador que cadastra

## Future

Phase 2: considerar webhook signature (HMAC-SHA256) além da API Key para garantir integridade do payload.
