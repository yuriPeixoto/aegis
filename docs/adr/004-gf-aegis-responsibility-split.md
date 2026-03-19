# ADR-004: Divisão de responsabilidades gestão frota ↔ Aegis

**Status:** Accepted
**Date:** 2026-03-18

## Context

O gestão frota já possui um sistema de tickets completo (criação, status, atribuição, respostas, anexos, notificações). O Aegis surge como camada de operações centralizada para a Unitop — não como substituto do GF, mas como painel unificado multi-instância.

A fronteira entre os dois sistemas precisa ser explícita para evitar duplicação de lógica e conflitos de estado.

## Decision

### gestão frota é responsável por:

- Criação de tickets pelo cliente
- Regras de transição de status (workflow interno, qualidade, etc.)
- Permissões por papel (Equipe Unitop, Equipe Qualidade, cliente)
- Upload e armazenamento de anexos
- Notificações para o solicitante (WhatsApp, email)
- Respostas do cliente ao ticket

### Aegis é responsável por:

- Inbox unificado multi-instância (Carvalima + Frigonorte + JSP + ...)
- Atribuição centralizada de tickets aos atendentes Unitop
- SLA e prazo em horas úteis (Phase 2)
- Painel de gestão: KPIs, métricas por cliente, por atendente, tickets atrasados (Phase 2)
- Fechamento automático de tickets inativos (Phase 2)
- Relatórios e analytics (Phase 3)

### Consequência arquitetural direta

A partir da integração (Phase 1), a **Equipe Unitop não interage mais com tickets pelo gestão frota**. As ações `assign` e `updateStatus` no `TicketController` do GF foram bloqueadas para o role `Equipe Unitop`, retornando mensagem de redirecionamento ao Aegis.

O campo `assigned_to` enviado ao Aegis via webhook é **sempre `null`** — a atribuição é responsabilidade exclusiva do Aegis.

## Consequences

- **Positivo:** Separação clara evita estado duplicado ou conflitante entre sistemas
- **Negativo:** Até o Aegis ter gerenciamento de status (Phase 2), a Equipe Unitop não pode alterar status pelo GF; superusers mantêm acesso como escape hatch
- **Importante:** O gestão frota vira um **produtor de eventos** — qualquer mudança de estado relevante dispara `SendTicketToAegis` via queue
