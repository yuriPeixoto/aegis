# ADR-006: Modelo de visibilidade e atribuição de tickets

**Status:** Accepted
**Date:** 2026-03-18

## Context

A Unitop opera como prestadora de serviços para múltiplos clientes (Carvalima, Frigonorte, JSP, etc.). Os atendentes não devem ver todos os tickets de todas as instâncias indiscriminadamente — a visibilidade deve refletir o fluxo de trabalho real.

## Decision

### Roles

Três roles no Aegis (campo `role` na tabela `users`):

| Role | Descrição |
|---|---|
| `admin` | Visão completa; pode atribuir qualquer ticket |
| `agent` | Vê apenas tickets atribuídos a si + fila sem atribuição |
| `viewer` | Somente leitura (reservado para Phase 2) |

### Modelo de visibilidade no inbox

O inbox possui três tabs de fila:

- **Minha fila** — tickets com `assigned_to_user_id = currentUser.id`
- **Sem atribuição** — tickets com `assigned_to_user_id IS NULL` (default)
- **Todos** — sem filtro de atribuição (admin)

### Fluxo de atribuição

1. Ticket chega no Aegis sempre com `assigned_to = null` (produtores não atribuem)
2. Admin/gestor acessa o inbox, tab "Sem atribuição"
3. Atribui via `PATCH /v1/tickets/{id}/assign` com `{ "user_id": int | null }`
4. Atendente vê o ticket na sua "Minha fila"

## Consequences

- **Positivo:** Separação clara entre fila de entrada e trabalho em andamento; sem ruído de tickets de outros atendentes
- **Negativo:** Phase 1 não tem UI de atribuição no inbox (apenas endpoint) — admin usa Swagger para atribuir durante o período de transição
- **Phase 2:** Painel de gestão com dropdown de atribuição direto no inbox, visão por atendente, KPIs
