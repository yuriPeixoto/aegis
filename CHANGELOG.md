# Changelog

All notable changes to this project will be documented in this file.

## [1.7.0] — 2026-09-04

### Added
- **Avatar/logo por cliente (Source)** — upload de imagem (JPEG/PNG/WebP/SVG, até 5MB) por cliente em Configurações → Clientes, exibido na inbox, no cabeçalho do chamado e no filtro de cliente. Sem logo, mantém o círculo com iniciais já usado pra usuários. Ticket Aegis #1306.

## [1.6.2] — 2026-09-04

### Fixed
- **Agenda: início da tarefa era apagado no fechamento do chamado** — o fluxo do #607 sobrescrevia `event_date`/`start_time` pro momento do fechamento, perdendo o horário real em que o trabalho começou. Agora o fechamento só grava `completed_at`/`end_time` (+ PR), preservando o início. Sem tarefa prévia agendada, cria uma já concluída com início=fim.
- **Agenda: "Iniciar atendimento" não registrava o início real** — se o chamado já tinha uma tarefa agendada (#602), clicar em "Iniciar atendimento" agora ajusta `event_date`/`start_time` dela pro momento real da transição `open→in_progress`, em vez de deixar o horário planejado original. Reabrir um chamado já concluído não reajusta a tarefa.

## [1.6.1] — 2026-09-04

### Added
- **Agenda: atalho "Agendar" no chamado** — botão na tela do chamado leva direto pra Agenda com o chamado armado (banner); o modal de criação de tarefa ganha um campo de busca (`TicketPicker`) pra vincular qualquer chamado ativo do próprio usuário, preenchendo título e cor automaticamente. Ticket Aegis #1250 (item #602, fecha a checklist 11/11).

## [1.6.0] — 2026-09-04

### Added
- **Agenda: tipo de tarefa genérico** — pra planejamento pessoal do dia a dia, além dos tipos já existentes (plantão, treinamento, deploy). Título livre, cor própria ou herdada da tag do chamado vinculado (`ticket_id`, já existente na tabela, agora exposto na API de criação/edição). Ticket Aegis #1250 (itens #594/#595).
- **Agenda: visões de dia e semana** — grid por hora (24h), ao lado do grid mensal já existente. A visão semanal mostra os 7 dias lado a lado na mesma grade, adicionada a pedido do usuário por ser o modo preferido dele de planejamento. Ticket Aegis #1250 (itens #596/#608).
- **Agenda: arrastar-e-soltar** — reagenda uma tarefa arrastando pra outro horário (dia/semana) ou outro dia (mês/semana), via `@dnd-kit/core`. Reusa o `PATCH /v1/calendar/events/{id}` já existente, sem endpoint novo. Ticket Aegis #1250 (item #597).
- **Agenda: tarefa é sempre privada** — só o dono vê a própria tarefa na Agenda, mesmo admin; plantão e treinamento continuam compartilhados com a equipe (a equipe precisa saber quem está de plantão ou indisponível por treinamento). Ticket Aegis #1250 (item #598).
- **Agenda: recorrência de tarefas** — repetição diária/semanal/mensal, com dias da semana e data-limite opcionais. Série materializada (cada ocorrência é uma linha independente com teto de segurança de ~2 anos) — editar ou excluir uma ocorrência não afeta as outras. Ticket Aegis #1250 (item #599).
- **Agenda: referência de expediente e feriados** — as visões de dia/semana sombreiam fora do horário de atendimento e o almoço da equipe, e marcam fins de semana/feriados cadastrados. Reaproveita `BusinessHoursConfig`/`SlaHoliday`, já mantidos em Configurações → SLA — sem CRUD novo, só um endpoint de leitura aberto a qualquer usuário (`GET /v1/settings/calendar-reference`). Ticket Aegis #1250 (item #600).
- **Fechamento de chamado atualiza a tarefa vinculada na Agenda** — em vez de criar um evento `type="deployment"` separado, o fechamento (`pending_closure` com data e PR) agora atualiza a tarefa já agendada pro chamado — ou cria uma já concluída, se nenhuma existia. Ganha hora de conclusão, PR (campo próprio agora, antes texto solto em `notes`), ícone de concluída e opacidade reduzida, e para de poder ser arrastada (é registro de fato, não plano). Ticket Aegis #1250 (item #607).

### Changed
- `pr_number` do `CalendarEvent` deixa de ser texto livre dentro de `notes` e vira campo próprio, estruturado.

## [1.5.1] — 2026-09-03

### Fixed
- **Ticket mesclado contava como atrasado pra sempre** — `merge_ticket()` nunca limpava `sla_due_at`/`sla_started_at` do ticket de origem, e a query de KPIs/atrasados (`dashboard_service._INACTIVE`) não incluía o status `merged`. Um ticket mesclado com SLA já vencido seguia contando pra sempre no dashboard. Corrigido nos dois pontos: `merge_ticket()` zera o SLA do ticket de origem no momento da mesclagem, e `_INACTIVE` passou a incluir `"merged"` (também protege tickets mesclados antes deste fix, que ainda têm `sla_due_at` velho no banco).
- **Mensagens novas do cliente pós-mesclagem se perdiam no ticket de origem** — `IngestService.record_event()`/`upsert_ticket()` resolviam o ticket só por `(source_id, external_id)`, sem checar `merged_into_ticket_id`. Uma resposta do cliente chegando depois da mesclagem caía no ticket já mesclado, invisível pra quem trabalha no ticket alvo. Agora redireciona (evento, mensagem e notificação) pro ticket ainda ativo, seguindo a cadeia inteira se o alvo tiver sido mesclado de novo depois (A→B→C). A resposta da API de ingest continua ecoando o `external_id` da requisição, não o do ticket onde a atualização efetivamente caiu.

Ticket Aegis #1287, achado durante a investigação do #1229/#1244 (Checklist Suite, Carvalima, 03/09/2026).

## [1.5.0] — 2026-09-03

### Added
- **Modal bloqueante para chamados críticos do Log Watcher** — reaproveita exatamente a infra do #1086 (mesmo modal sem dismissal por Escape/clique fora, só "Ciente"/"Ver ticket"), mas o gatilho passa a ser a criação de um ticket vindo da Source dedicada do log-watch-aegis (`slug` `log-watcher`), em vez de atribuição. A tag "Log Watcher" é criada/aplicada automaticamente no ticket nesse momento. Dispara só uma vez, na criação — um upsert de atualização do mesmo ticket não repete a notificação. Escopo reduzido de propósito só ao Log Watcher por ora; Cronwatch fica para uma iteração futura (mapa `_CRITICAL_SOURCE_ALERTS` já preparado pra receber a segunda entrada). Ticket Aegis #1271.

## [1.4.1] — 2026-09-02

### Fixed
- **Ruído da regra de escalação "Sem atualização — 48h"** — regra disparava pra qualquer prioridade, acumulando 10-20+ notas internas repetidas em tickets de baixa prioridade parados há meses. Restrita a high/urgent; nova regra irmã pra low/medium com cooldown de 7 dias (era 24h); disparos repetidos da mesma regra no mesmo ticket agora atualizam a nota automática existente em vez de criar uma nova a cada vez (`ticket_messages.escalation_rule_id`). Ticket Aegis #1249.

### Chore
- Normalizado 1 registro isolado com `type='melhoria'` (português) pra `'improvement'`, inconsistência de dado achada em auditoria geral do banco. Ticket Aegis #1252.

## [1.4.0] — 2026-09-01

### Added
- **Registro de Treinamento com assinatura de participantes** — novo módulo para registrar treinamentos internos (presencial ou remoto): lista de participantes, coleta de assinatura via link público não-autenticado (mesmo mecanismo pra presencial e remoto — o participante assina no próprio celular ou num dispositivo compartilhado) e exportação em PDF (WeasyPrint + Jinja2, embutido no processo da API). Modelo, service, PDF service, rotas públicas/internas, testes. Ticket Aegis #985 (`docs/adr/011-training-attendance-records.md`).
- **Confirmação obrigatória ao atribuir um chamado** — modal bloqueante (sem dismissal por Escape/clique fora, via `createPortal`) exibido pro atendente assim que um ticket é atribuído a ele; evita que atribuições passem despercebidas na sidebar. Pula auto-atribuição e reatribuição para o mesmo agente (sem notificação duplicada). Ticket Aegis #1086.
- **Sub-status do GF exposto quando `pending_closure`** — `aguardando_cliente` e `aguardando_validacao_cliente` do Gestão de Frota colapsam no mesmo status `pending_closure` aqui (ADR-003, decisão deliberada ligada à lógica de SLA); o status bruto do GF agora fica em `source_metadata.gf_status_raw` e aparece como sub-badge no detalhe do ticket, disambiguando "cliente precisa responder" de "cliente precisa confirmar a resolução".
- **`PATCH /v1/tickets/{id}/type`** — endpoint novo pra editar o tipo do chamado, restrito a `AdminUser` (tipo dispara o fluxo de revisão de qualidade do GF, então a mudança precisa ser deliberada). Prioridade continua editável por qualquer agente.

### Fixed
- **Clique em imagem numa mensagem baixava o arquivo em vez de abrir visualização** — e a imagem, ao ampliar, sobrepunha o modal "Reportar Problema" por causa de stacking context de `position: sticky`/`fixed`. Adicionado `ImageLightboxModal`; modais renderizados via `createPortal(..., document.body)`. Ticket Aegis #1168 (mesma causa raiz do #461).
- **Tela de detalhe do chamado não rolava automaticamente até a última mensagem ao abrir** — a dependência do `useEffect` "assentava" no valor final enquanto ainda em loading, então nunca disparava de novo quando o DOM real montava. Ticket Aegis #1085.
- **Data do treinamento na tela pública de assinatura aparecia em ISO (`2026-09-01`) em vez do formato local (pt-BR/en)**.

## [1.3.2] — 2026-07-30

### Security
- **Rotas de leitura de chamados exigiam autenticação nenhuma** — `GET /v1/tickets` e `GET /v1/tickets/{ticket_id}` respondiam 200 sem cabeçalho algum, de fora da rede, expondo cliente de origem, `external_id`, assunto, descrição completa, status, prioridade, responsável, CSAT e datas de agendamento de deploy. Era omissão pontual da dependência de auth nas duas assinaturas, não decisão de arquitetura: todas as rotas vizinhas (escrita, mensagens, notas, tags, usuários) já exigiam `CurrentUser`/`AdminUser`. Adicionada `CurrentUser` nas duas, com testes de regressão cobrindo 401 sem credencial e 401 com chave de *source* — chave de source autentica ingestão, nunca leitura de dashboard, senão a chave de um cliente leria os chamados de todos.

  Nenhum consumidor quebra: o GF só faz `POST /v1/ingest/*` com chave de source, e frontend, MCP e weekly-report já mandavam JWT ou chave de usuário.

Ticket Aegis #1038 (`AEGIS-1785339191`).

### Added
- **MCP — checklist de progresso** — novas tools `list_checklist`, `add_checklist_items` (aceita lista, cria na ordem informada), `update_checklist_item` e `delete_checklist_item`; `get_ticket` passou a exibir a seção da checklist (o payload já trazia o campo, o MCP descartava); `create_ticket` aceita `checklist_items` opcional, criando o ticket já quebrado em subtarefas numa única chamada. Itens são identificados por `item_id` ou por texto (exato, depois substring) — texto ambíguo falha listando os candidatos, sem alterar nada. Nenhuma mudança de API foi necessária: os endpoints `POST/PATCH/DELETE /v1/tickets/{id}/checklist` já existiam desde a v1.1.0 e aceitam `X-Aegis-Key`.

  Vale só para quem roda o MCP (`mcp/` não faz parte do que sobe pro servidor) — entrou nesta versão por carona no release da correção acima.

Ticket Aegis #1049 (`AEGIS-1785438562`).

## [1.3.1] — 2026-07-22

### Fixed
- **Versão no rodapé da sidebar travada em v1.0.0** — texto hardcoded em `Sidebar.tsx`; agora busca dinamicamente via `useAbout()` (`GET /v1/about`). Cor trocada de cinza (`text-slate-600`) pra verde (`text-brand-neon`), mesma cor usada na página Sobre.

Achado por um colega. Sem ticket Aegis (mini hotfix).

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
