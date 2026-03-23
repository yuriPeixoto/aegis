# SLA — Implementação e Roadmap

## O que foi implementado

### Configuração em banco

**`business_hours_config`** (tabela singleton, id=1)
- Horário comercial: seg–sex, 08:00–17:40
- Almoço: 11:30–12:30
- Timezone: `America/Cuiaba`
- Editável diretamente no banco; UI de configuração está no roadmap

**`sla_policies`** (por prioridade, em horas úteis)
| Prioridade | Horas úteis | Equivalente aproximado |
|---|---|---|
| urgent  |  6h | < 1 dia útil |
| high    | 24h | ~3 dias úteis |
| medium  | 40h | ~5 dias úteis |
| low     | 56h | ~7 dias úteis |

### Ciclo de vida do SLA por ticket

| Transição de status | Efeito no SLA |
|---|---|
| `open → in_progress` | Clock inicia; `sla_due_at` calculado em horas úteis a partir deste momento |
| `in_progress → waiting_client` | Clock pausado (`sla_paused_since = now`) |
| `waiting_client → in_progress` | Clock retomado; `sla_due_at` estendido pelo tempo pausado |
| `→ pending_closure / resolved / closed / cancelled` | Clock finalizado; pausa pendente acumulada |

**Regra de cálculo:** o prazo é calculado em horas úteis reais, ignorando fins de semana, período fora do expediente e intervalo de almoço. Um ticket urgente aberto às 16h30 de uma sexta recebe prazo para segunda às ~10h40.

### Campos novos em `tickets`

| Campo | Tipo | Descrição |
|---|---|---|
| `sla_started_at` | timestamptz | Quando o clock SLA iniciou (primeira transição para `in_progress`) |
| `sla_paused_seconds` | int | Total acumulado de segundos em `waiting_client` |
| `sla_paused_since` | timestamptz | Momento em que a pausa atual começou (null se não está pausado) |

### `sla_status` computado (API)

| Valor | Condição |
|---|---|
| `null` | Sem `sla_due_at` (prioridade sem política configurada) |
| `on_time` | Ativo, >20% do prazo restante |
| `at_risk` | Ativo, ≤20% do prazo restante |
| `paused` | Em `waiting_client` com pausa ativa |
| `overdue` | Deadline ultrapassado (e não pausado) |
| `met` | Status terminal (`pending_closure`, `resolved`, `closed`, `cancelled`) |

### Override de prazo

`PATCH /v1/tickets/{id}/sla` — restrito a `admin`

```json
{ "due_at": "2026-03-25T17:00:00Z", "reason": "Aguardando fornecedor externo" }
```

Registra evento `sla_overridden` no histórico do ticket.

**UI de override:** ainda não implementada (ver roadmap abaixo).

### Dashboard

- `total_open` exclui `pending_closure` (SLA já encerrou)
- `overdue` exclui tickets atualmente pausados (`waiting_client`)
- `resolved_today` conta `pending_closure + resolved + closed`
- "Carga por Atendente" → coluna Resolvidos conta os mesmos três status

---

## O que falta para o MVP

### Alta prioridade

- [ ] **UI de override de prazo** — botão na sidebar do ticket (visível só para admin), abre popover com campo datetime + motivo opcional
- [ ] **UI de configuração do SLA** — tela em Settings para editar `business_hours_config` e `sla_policies` sem precisar acessar o banco diretamente
- [ ] **GF → Aegis status sync** — job `SendStatusChangeToAegis` no GF para notificar o Aegis quando o status muda pelo lado do cliente (ex: cliente reabre, gestor fecha)

### Média prioridade

- [ ] **Feriados** — tabela `sla_holidays` para descontar dias não úteis do cálculo (ex: Natal, feriados locais)
- [ ] **SLA por source** — permitir que cada cliente (source) tenha seu próprio horário comercial e políticas, em vez de usar só a config global
- [ ] **`resolved_at` dedicado** — coluna timestamp para registrar exatamente quando o ticket foi resolvido, em vez de usar `last_synced_at` como proxy no MTTR

### Baixa prioridade / pós-MVP

- [ ] **First Response Time (FRT)** — medir tempo até a primeira mensagem outbound do agente, separado do tempo de resolução
- [ ] **Escalação automática** — notificar agente/admin quando SLA está `at_risk` ou `overdue`
- [ ] **Relatório de SLA** — página com histórico de compliance por período, por agente, por prioridade
