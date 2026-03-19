# ADR-003: Normalização de enums na ingestão (GF → Aegis)

**Status:** Accepted
**Date:** 2026-03-18

## Context

O gestão frota usa enums em português (`novo`, `em_atendimento`, `melhoria`, `alta`) enquanto o Aegis precisa de valores agnósticos de idioma para suportar múltiplos sistemas fonte no futuro.

O frontend do Aegis exibe badges traduzidos — o banco deve armazenar valores canônicos em inglês lowercase.

## Decision

A responsabilidade de mapeamento é do **produtor** (gestão frota), não do Aegis.

O `SendTicketToAegis` job mapeia antes de enviar:

| GF (source) | Aegis (canonical) |
|---|---|
| `novo` | `open` |
| `em_atendimento` / `aguardando_qualidade` | `in_progress` |
| `aguardando_cliente` / `aguardando_validacao_cliente` | `waiting_client` |
| `resolvido` | `resolved` |
| `fechado` | `closed` |
| `cancelado` | `cancelled` |
| `melhoria` | `improvement` |
| `alta` / `urgente` | `high` / `urgent` |

O Aegis armazena o valor canônico recebido sem transformação adicional.

O frontend normaliza para uppercase antes do lookup de tradução (`.toUpperCase()`), permitindo que o banco armazene `open` e o badge exiba "Aberto" / "Open".

## Consequences

- **Positivo:** Aegis permanece agnóstico de idioma; novos sistemas podem mapear para os mesmos valores canônicos; frontend simples com lookup estático
- **Negativo:** Cada novo sistema fonte precisa implementar seu próprio mapeamento
- **Lição aprendida:** Assumir que o banco armazena uppercase foi o erro inicial — sempre verificar com `SELECT` real antes de implementar traduções no frontend

## Canonical Values Reference

```
status:   open | in_progress | waiting_client | waiting_dev | in_dev |
          waiting_test | in_test | resolved | closed | cancelled

priority: low | medium | high | urgent

type:     bug | improvement | question | support
```
