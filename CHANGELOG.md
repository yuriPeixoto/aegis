# Changelog

All notable changes to this project will be documented in this file.

## [1.3.0] — 2026-07-22

### Added
- **Markdown em mensagens, notas internas e descrição de tickets** — negrito, itálico, listas, links (abrem em nova aba) e blocos de código, renderizados via `react-markdown` + `remark-gfm`. Quebra de linha simples (Enter) preservada com `remark-breaks`, já que os campos são chat-style. `@menção` continua com destaque próprio (âmbar), agora via nó mdast dedicado em vez de reaproveitar negrito.
- **Toggle Escrever / Pré-visualizar** — no campo de resposta do ticket (público/nota interna) e na descrição do chamado interno, no padrão GitHub.
- **Campo de resposta mais alto** — de `rows={3}` (~72px) para `min-h-[140px]`.

Ticket Aegis #901 (`AEGIS-1784032873`).

## [1.2.1] — 2026-07-20

### Fixed
- **Histórico de Eventos com base64 gigante** — chamados que já nascem com anexos (via `POST /v1/ingest/tickets`) gravavam o payload de criação/sincronização com o base64 completo dos anexos no evento; a limpeza que já existia para eventos avulsos (`record_event`) não cobria esses dois caminhos. Extraída pra um helper compartilhado (`_cleanse_attachments_for_event`), agora aplicada nos três pontos — o evento passa a exibir só `filename`/`size_bytes`/`content_type`.
- **Status "em_atendimento" do cliente sobrescrevia o status do Aegis** — evento `status_changed` vindo do GF aplicava `em_atendimento → in_progress` automaticamente no ticket do Aegis, mesmo quando a mudança partiu do próprio cliente no portal do GF (issue conhecida, ver `docs/gf-ticket-client-refactor.md` §3.4 — correção definitiva é do lado do GF, ainda pendente). Removido esse mapeamento de `_GF_TO_AEGIS`: o evento continua registrado na timeline pra visibilidade, mas iniciar o atendimento (`in_progress`) volta a ser decisão exclusiva do agente via dashboard.
- **Logout automático no meio do expediente** — token JWT expirava em 8h a partir do login; um login às 08:30 expirava às 16:30, no meio do bloco de trabalho da tarde (13:00–17:30). `access_token_expire_minutes` ajustado de 480 pra 720 (12h).

## [1.2.0] — 2026-07-06

### Added
- **Vista com seleção fixa de chamados** — salvar uma vista com uma lista fixa de tickets (selecionados via checkbox na inbox), em vez de critérios de filtro. Útil para sprints semanais enviadas por clientes: a vista mostra exatamente aqueles chamados, independente do status atual. `GET /v1/tickets` aceita `ticket_ids` como override exclusivo dos demais filtros.

## [1.1.0] — 2026-07-06

### Added
- **Checklist de subitens por chamado** — dev pode quebrar chamados complexos em itens marcáveis (padrão ClickUp/GitHub Issues, sem workflow próprio); o progresso (%) é sempre derivado (`done/total`), nunca setado manualmente. O GF pode pré-preencher a checklist na abertura do chamado e recebe o progresso atualizado de volta em modo somente leitura. Impacto em Dashboard Overview, Monitor de Equipe, Perfil do Agente e Relatórios. Ver [ADR-010](docs/adr/010-ticket-checklist-progress.md).
- **MCP — tags por projeto** — `create_ticket` aceita `project` opcional (aplica a tag correspondente, mesma cor do Google Calendar); novas tools `list_tags` e `set_tag_color`.

### Fixed
- **Download de anexos** — nome de arquivo com acentos corrompido no `Content-Disposition` (agora usa `filename*=UTF-8''`).

## [1.0.3] — 2026-06-29

### Fixed
- **Download de anexos PNG em mensagens** — `download_url` de anexos de mensagem apontava para `/attachments/{id}/download` sem o prefixo `/v1/`, fazendo o Apache servir o `index.html` do SPA (200 OK com HTML) em vez do arquivo real; corrigido para `/v1/attachments/{id}/download`

## [1.0.2] — 2026-06-24

### Fixed
- **"Aberto por" na view do ticket** — exibe o nome de quem abriu o chamado na sidebar (tickets do GF via `source_metadata.user_name`; tickets internos e do MCP agora também gravam o nome do criador)
- **Select "Atribuído a" exigia dois cliques** — corrigido com estado local otimista; o select atualiza imediatamente ao selecionar
- **Download de imagens em mensagens** — `SecureImage` e download inline em mensagens tinham o mesmo bug `/v1/v1/` do `AttachmentsPanel` (corrigido junto)

## [1.0.1] — 2026-06-24

### Fixed
- **Attachment download from GF** — axios `baseURL` `/v1` was double-prefixing `download_url` to `/v1/v1/attachments/…`, causing 404 on all attachment downloads from ingested tickets

## [1.0.0] — 2026-06-24

### Added
- **Unified inbox** with filters, smart sort, and 30s auto-refresh
- **Bidirectional conversation** — client replies in source system, team replies in Aegis
- **Attachment support** — images, documents, and video
- **Internal notes** with @mention of agents and in-app notification center
- **Browser notifications** for high/urgent tickets (OS-level, with per-user preferences)
- **SLA tracking** — business-hours policies, holidays, pause/resume, admin override
- **Escalation rules** — automatic escalation based on SLA and configurable conditions
- **Manager dashboard** — KPIs, queue metrics, overdue tickets, unassigned items
- **Agent profile page** — per-agent KPIs, volume trend, workload charts, ticket history
- **Reports dashboard** — charts by volume, resolution time, SLA rate, agent, and client
- **Analytics API** — MTTR, SLA compliance over time, date-range filtering, ML extension points
- **Canned responses** — reusable reply templates for common issues
- **Ticket tags** and saved views (named filter sets)
- **Bulk operations** — assign, close, or change priority from inbox
- **Auto-close** — configurable inactivity threshold
- **Ticket merging** for duplicate consolidation
- **CSAT** — satisfaction survey on ticket close with bidirectional webhook flow
- **Team calendar** — on-call schedule and client training sessions (Phase 4.5)
- **User management** — create/edit/activate agents and admins (admin only)
- **Source management** — register clients, generate API keys, configure webhooks
- **Webhook ingestion** — external systems push tickets via REST API + API key
- **Webhook-out** — push status changes and team replies back to source
- **gestão frota integration** — `SendTicketToAegis` job with enum mapping
- **i18n** — EN / PT-BR via react-i18next
- **View /sobre** — build info (version, date, environment) and quick links
- **CI** — ruff + mypy + pytest on every push (GitHub Actions)
