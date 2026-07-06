# ADR-010 — Progresso de chamados via checklist de subitens

**Data:** 2026-07-06
**Status:** Implementado (MVP + Fase 2 — Aegis + criação e sync reverso pelo GF). Fase 3 (impacto em dashboards/relatórios internos) em andamento.

---

## Contexto

O `Ticket` hoje só tem `status` (open/in_progress/pending_closure/resolved/closed/cancelled).
Para chamados complexos (múltiplas frentes de trabalho), nem o dev nem o cliente conseguem
sinalizar "quanto falta" sem perguntar diretamente — o status é binário demais para isso.

Ticket interno #812 (`AEGIS-1783011160`).

### Pesquisa de mercado

| Ferramenta | Mecanismo de progresso |
|---|---|
| **Jira** | Subtasks — issues filhas completas, com workflow, assignee e status próprios. Pesado: cada subtask é uma entidade rastreável isolada. |
| **ClickUp** | Checklist de itens dentro da task — texto livre, checkbox on/off, sem workflow. Progresso (%) é sempre derivado de `done/total`. |
| **GitHub Issues** | Task list em Markdown (`- [ ] item`) — mesma ideia do ClickUp, mais informal ainda (nem tabela dedicada, é parseado do corpo da issue). |

Jira resolve o mesmo problema com uma estrutura muito mais pesada do que o caso de uso exige
aqui. O padrão ClickUp/GitHub (checklist leve, sem ciclo de vida próprio) é suficiente para os
dois cenários do pedido original:

1. Dev quer sinalizar avanço informal (equivalente a "25/50/75/100%") sem lembrar de atualizar um campo manualmente.
2. Cliente quer pré-quebrar a tarefa em itens ao abrir o chamado.

---

## Decisão

**Opção B (ClickUp/GitHub) — checklist de subitens com progresso auto-calculado.** A opção A
(`% manual: 25/50/75/100`) foi descartada: é subjetiva, exige que o dev lembre de atualizar, e
não gera nenhum artefato reaproveitável (não dá pra saber *o quê* está pendente, só *quanto*).

### Modelo de dados

Nova tabela `ticket_checklist_items` (migration `032`), sem campo de progresso em `tickets` —
o `%` é sempre derivado (`done/total`), nunca setado manualmente:

```
id            PK
ticket_id     FK tickets.id (CASCADE)
text          string(500)
is_done       bool, default false
position      int — ordem de exibição
created_by    FK users.id (SET NULL, nullable) — null quando criado via ingest do GF
done_by       FK users.id (SET NULL, nullable)
done_at       timestamptz, nullable
created_at    timestamptz
```

Nenhum campo de status próprio por item, nenhum workflow — diferente de Jira Subtasks.

### API (Aegis)

```
POST   /v1/tickets/{id}/checklist            body: {text}
PATCH  /v1/tickets/{id}/checklist/{item_id}  body: {text?, is_done?}
DELETE /v1/tickets/{id}/checklist/{item_id}
```

`TicketResponse` ganha `checklist_progress: {done, total} | None`. `TicketDetailResponse` ganha
também `checklist_items: ChecklistItemResponse[]` completo (mesmo padrão de `events`).

Toggle e criação geram `TicketEvent` (`checklist_item_toggled` / `checklist_item_added`) —
aparecem no histórico do ticket como qualquer outra mudança.

### Ingestão (GF → Aegis)

`TicketIngestPayload` ganha campo opcional `checklist_items: list[str]`. Quando o GF cria um
ticket com itens de checklist pré-preenchidos pelo cliente, o `IngestService.upsert_ticket`
cria os itens em bloco (`ChecklistService.create_items_bulk`) apenas na criação inicial do
ticket — atualizações subsequentes (`upsert` de ticket já existente) não tocam na checklist,
que passa a ser gerenciada só pelo Aegis a partir daí.

### Escopo do MVP — o que ficou de fora

- **Edição de checklist pelo GF após a criação** — só o Aegis pode criar/editar/remover itens
  depois que o ticket existe. O GF só envia a lista inicial no momento da abertura do chamado.
- **Reordenação de itens** (`position` além da ordem de criação) — não há endpoint de reorder.
- **Notificação dedicada por item concluído** — o evento fica no histórico, mas não dispara
  notificação separada (o webhook de `status_changed` já existente continua sendo o principal
  sinal externo).

### Fase 2 (implementada em 06/07/2026) — sync reverso pro GF

O cliente que abriu o chamado precisava ver o progresso, não só o dev (mesmo princípio do
GitHub Issues: o autor da issue vê o checklist e a barra "X of Y tasks" na própria issue, sem
precisar de um canal separado). Implementado:

- Toda mutação de item (criar/editar/marcar/remover) dispara um webhook `checklist_updated`
  (mesmo mecanismo dos webhooks existentes — `assigned`, `status_changed`, `agent_reply`) com o
  **snapshot completo** da checklist (`items[]`, `done`, `total`) — não eventos incrementais.
  Evita drift entre os dois sistemas caso um webhook seja perdido: o próximo snapshot corrige.
  Guard clause idêntica às demais: só dispara se `source.webhook_url` estiver configurado.
- GF ganhou uma tabela espelho **somente leitura**, `ticket_checklist_items`
  (`alteracoes_bd/2026_07_06_create_ticket_checklist_items.sql`) — sem `created_by`/`done_by`,
  pois não há mapeamento de conta cross-system e essa informação já vive no Aegis.
- `AegisWebhookController::handleChecklistUpdated` substitui a checklist local inteira
  (delete + insert em transação) a cada evento — GF nunca edita, só reflete.
- UI do GF: checklist read-only com barra de progresso na página do chamado (`tickets/show`,
  logo abaixo da descrição) + badge `done/total` na listagem (`tickets/index`), ambos
  visíveis para o cliente que abriu o chamado.
- **Continua fora de escopo:** edição da checklist pelo GF, reordenação, notificação dedicada.

### Fase 3 (implementada em 06/07/2026) — impacto nas páginas internas do Aegis

O gestor precisa enxergar "trabalho ainda sendo rastreado" nas telas que já usa todo dia, sem
precisar abrir ticket por ticket. Reaproveitados os extension points já existentes
(`features{}`/`meta{}` do ADR-008) em vez de criar endpoints novos:

- **Overview (`GET /v1/dashboard/stats`):** novo KPI `tickets_with_open_checklist` — chamados
  ativos com pelo menos um item pendente. Card "Checklist Pendente" na `OverviewTab`.
- **Monitor de Equipe (`GET /v1/dashboard/agent-monitor`):** cada ticket do agente ganha
  `checklist_progress: {done, total} | null`. Badge `done/total` ao lado do indicador de SLA
  em cada linha da `AgentMonitorCard`.
- **Perfil do Agente (`GET /v1/analytics/agent/{id}`):** `features.checklist_items_completed_period`
  — quantos itens esse agente marcou como concluído no período (`done_by` + `done_at`,
  independente do ticket estar atribuído a ele hoje). 7º KPI card na `AgentProfilePage`.
- **Relatórios (`GET /v1/analytics/overview`):** `checklist_items_completed` — throughput da
  equipe inteira no período. 5º KPI card na `ReportsTab`.

Nenhum desses campos altera o shape dos consumidores existentes — são adições aditivas, o
mesmo princípio do ADR-008 (`features` e `meta` já existiam justamente para isso).

---

## Consequências

- `%` do chamado nunca fica desatualizado por esquecimento — é sempre `done/total` calculado
  na hora da resposta, nunca persistido.
- Cliente (GF) e dev (Aegis) cobrem os dois cenários do pedido original com uma única
  estrutura de dados, sem duplicar lógica de workflow.
- Se no futuro for necessário workflow por item (assignee, prazo, status próprio), a
  tabela atual não suporta — nesse caso a solução correta seria promover para Jira-style
  subtasks (nova entidade `Ticket` filha), não estender `ticket_checklist_items`.
