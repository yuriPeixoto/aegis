# Aegis — Roadmap

## Fase 1 — Fundação & Caixa de Entrada Unificada ✅
> Objetivo: resolver o problema imediato de negócio — um lugar único para ver todos os chamados de todas as instâncias do gestão frota.
> **Concluída em:** 19/03/2026

| # | Funcionalidade | Status | Tipo |
|---|----------------|--------|------|
| 1 | Setup do projeto: FastAPI + SQLAlchemy + Alembic + PostgreSQL + CI | ✅ | infra |
| 2 | Gestão de fontes: cadastro de origens, geração e validação de chaves de API | ✅ | feature |
| 3 | Schema do banco: migrations de sources, tickets, ticket_events, users | ✅ | infra |
| 4 | API de ingestão: `POST /v1/ingest/tickets` e `POST /v1/ingest/tickets/events` | ✅ | feature |
| 5 | API de leitura de chamados: listagem com filtros + paginação + detalhe | ✅ | feature |
| 6 | Autenticação: login JWT, endpoint `/me`, papéis (admin/agente/visualizador) | ✅ | feature |
| 7 | Setup do frontend: Vite + React 18 + TS + Tailwind + TanStack Query + i18next | ✅ | infra |
| 8 | Frontend: inbox unificada — filtros, abas de fila, painel de detalhe do chamado | ✅ | feature |
| 9 | Integração gestão frota: job `SendTicketToAegis` + mapeamento de enums | ✅ | feature |
| 10 | Papéis + atribuição: campo `role` nos usuários, `assigned_to_user_id` nos chamados, PATCH assign | ✅ | feature |
| 11 | i18n: PT-BR/EN via react-i18next | ✅ | feature |
| 12 | Configurações: UI de gestão de clientes (fontes) com geração de chave de API (somente admin) | ✅ | feature |
| 13 | ADRs: 001–006 | ✅ | docs |

---

## Fase 2 — Fluxo de Trabalho do Time ✅
> Objetivo: o time consegue gerenciar chamados inteiramente dentro do Aegis.
> **Concluída em:** 25/03/2026

| # | Funcionalidade | Status | Tipo |
|---|----------------|--------|------|
| 1 | UI de gestão de usuários: criar/editar/ativar agentes e admins nas Configurações | ✅ | feature |
| 2 | Motor de SLA: políticas em horas úteis, feriados, pausa/retomada, ajuste manual pelo admin | ✅ | feature |
| 3 | Dashboard do gestor: KPIs, vencidos, sem atribuição, métricas por agente e por cliente | ✅ | feature |
| 4 | Submenu do dashboard: Visão Geral / Monitor de Equipe / Relatórios (placeholder) | ✅ | feature |
| 5 | Webhook de saída: envia mudanças de status de volta à origem quando o time age | ✅ | feature |
| 6 | URL do webhook configurável por fonte nas Configurações | ✅ | feature |
| 7 | Conversa bidirecional: respostas do time no Aegis visíveis na origem | ✅ | feature |
| 8 | Suporte a anexos: upload e visualização de documentos e imagens nos chamados | ✅ | feature |
| 9 | Soft-delete de fonte: inativar um cliente oculta todos os seus chamados em todo o sistema | ✅ | feature |
| 10 | Inbox: filtro "Em aberto" (active_only), busca por texto, auto-refresh (30s) | ✅ | feature |
| 11 | Inbox: ordenação inteligente — por prioridade, chamados em estado terminal no fim | ✅ | feature |
| 12 | Badge no sidebar: contagem em tempo real da fila ativa do agente | ✅ | feature |
| 13 | Fluxo de troca de senha no primeiro login | ✅ | feature |

---

## Fase 3 — Central de Suporte Completa ✅
> Objetivo: Aegis se torna uma central de suporte completa — à altura do Zendesk/Freshdesk, adaptada a este ecossistema.
> **Concluída em:** 28/03/2026

| # | Funcionalidade | Descrição | Status |
|---|----------------|-----------|--------|
| 1 | Relatar um problema | Opção interna de gerar um chamado de dentro do Aegis | ✅ |
| 2 | Fechamento automático | Fechar automaticamente chamados inativos além de um prazo configurável | ✅ |
| 3 | Operações em lote | Atribuir, fechar e alterar prioridade em massa direto da inbox | ✅ |
| 4 | Respostas prontas | Templates de resposta pré-escritos para problemas recorrentes | ✅ |
| 5 | Etiquetas de chamado | Rótulos livres para classificação e filtragem | ✅ |
| 6 | Notas internas na conversa | Notas visíveis apenas para o time, intercaladas na linha do tempo — com @menção de agentes | ✅ |
| 6.1 | Central de @menções | Ícone de sino no cabeçalho com badge de não lidas; dropdown com "X mencionou você em #ID"; clique navega ao chamado e marca como lida; marcação automática ao abrir o chamado | ✅ |
| 7 | Mesclagem de chamados | Mesclar chamados duplicados — mensagens consolidadas, origem fica com status=merged, irreversível | ✅ |
| 8 | Regras de escalonamento | Escalonar automaticamente chamados vencidos ou de alta prioridade para agente sênior | ✅ |
| 9 | Visões customizadas / filtros salvos | Salvar um conjunto de filtros como uma visão nomeada (ex.: "Urgentes sem atribuição") | ✅ |
| 10 | CSAT (pesquisa de satisfação) | Breve pedido de feedback enviado ao cliente ao fechar o chamado — flag por fonte, % de amostragem, fluxo bidirecional via webhook com o gestão frota | ✅ |
| 11 | Notificações browser para chamados urgentes | Balão do SO + badge na aba + som opcional quando um chamado high/urgent chega — admins notificados mesmo quando o Aegis não está em foco. Preferências por usuário nas Configurações. Ver [ADR-007](adr/007_browser_notifications.md) | ✅ |

---

## Fase 4 — Analytics e Relatórios
> Objetivo: visibilidade sobre os padrões de suporte e a performance do time.
> Itens ordenados por sequência de execução: API como fundação primeiro, visão de agente (alta urgência dos admins) logo em seguida, exports adiados até o modelo de dados estar estável.
>
> **Pontos de extensão para ML:** a API de analytics (4.1) foi projetada com ganchos explícitos para os itens ML abaixo (4.6, 4.7) e para a Phase 7. Antes de implementar qualquer feature ML, leia o [ADR-008](adr/008_analytics_ml_extension_points.md) — ele documenta os contratos de `features{}`, `insights[]`, `meta{}` e `granularity`, e lista exatamente quais endpoints adicionar em `/v1/analytics/` sem tocar nos existentes.

| # | Funcionalidade | Descrição | Prioridade | Status |
|---|----------------|-----------|------------|--------|
| 1 | API de analytics | MTTR por fonte/tipo/prioridade, tendências de volume, conformidade de SLA ao longo do tempo. Ver [ADR-008](adr/008_analytics_ml_extension_points.md) para pontos de extensão ML. | Alta | ✅ |
| 2 | Seletor de período | Filtrar todas as métricas do dashboard por intervalo de datas configurável — componente reutilizável em todas as telas de analytics | Alta | ✅ |
| 3 | Página de Perfil do Agente | Página dedicada por agente: KPIs (total, abertos, resolvidos, MTTR, taxa de SLA, CSAT médio), gráfico de volume temporal, gráficos de carga por prioridade e tipo, histórico completo de chamados com filtros. Admins selecionam qualquer agente; agentes veem o próprio. Linkada no Monitor de Equipe e na Gestão de Usuários. | Alta | ✅ |
| 4 | Dashboard de relatórios | Gráficos (Recharts): volume de chamados, tempo de resolução, taxa de SLA, breakdown por agente e por cliente | Alta | ✅ |
| 5 | Analytics de CSAT | Nota média por fonte/período, taxa de resposta, histograma de distribuição, lista de chamados com pior avaliação | Alta | |
| 6 | Insights automáticos *(ML)* | Detectar anomalias em volume/tipo/SLA — "Tipo X aumentou 40% este mês no Cliente Y" sem consultas manuais. Injetar resultados no array `insights[]` já presente em `GET /v1/analytics/overview` — ver [ADR-008 §2](adr/008_analytics_ml_extension_points.md). | Média | |
| 7 | Preditor de breach de SLA *(ML)* | Sinalizar chamados com alta probabilidade de violar o SLA antes que isso ocorra, com base em tipo, prioridade e histórico de resolução — alimenta um widget "em risco" no dashboard. Adicionar `GET /v1/analytics/predictions/sla` no router existente — ver [ADR-008 §5](adr/008_analytics_ml_extension_points.md). | Média | |
| 8 | Exportação CSV | Exportar lista filtrada de chamados ou resumo de relatório para CSV | Média | |
| 9 | Relatório em PDF | Resumo executivo com gráficos (ReportLab / WeasyPrint) | Média | |

---

## Fase 4.5 — Agenda da Equipe ✅
> Objetivo: calendário operacional compartilhado — escala de plantão dos sábados (gerenciada por admins) e agendamento de treinamentos de clientes (por agentes). Dado de disponibilidade que alimentará o balanceador de carga da Fase 7.5.
> **Concluída em:** 13/04/2026

| # | Funcionalidade | Descrição | Prioridade | Status |
|---|----------------|-----------|------------|--------|
| 1 | Modelo de dados & API | Tabela `calendar_events`: type (`on_call` \| `training`), agente, data/hora, source opcional, notas. CRUD em `/v1/calendar/` | Alta | ✅ |
| 2 | Escala de plantão | Admin atribui um agente por sábado (ou qualquer data); grid mensal mostra quem está de plantão; agente vê seus próprios turnos futuros | Alta | ✅ |
| 3 | Treinamentos | Agente cria sessão de treinamento vinculada a um cliente (source) — data, hora, duração, notas opcionais | Alta | ✅ |
| 4 | Calendar UI | View mensal unificada, color-coded por tipo (plantão vs treinamento); clique para criar/editar/excluir | Alta | ✅ |
| 5 | Entrada no sidebar | Item "Agenda" acessível a todos os roles; criação restrita por role (plantão: somente admin; treinamento: agente + admin) | Média | ✅ |
| 6 | Integração com Perfil do Agente | Página de perfil do agente (4.3) exibe próximos plantões e treinamentos agendados | Baixa | ✅ |

---

## Fase 5 — Integração com o Ecossistema
> Objetivo: conectar o Aegis ao restante do ecossistema interno.

| # | Funcionalidade | Descrição | Prioridade |
|---|----------------|-----------|------------|
| 1 | Integração Maestro | Receber webhooks de anomalia como chamados de incidente automáticos | Alta |
| 2 | Integração Orquestra | Decisões de governança geram chamados rastreáveis no Aegis | Média |
| 3 | Webhook de saída genérico | Webhooks de saída configuráveis por tipo de evento para qualquer fonte | Média |
| 4 | Importação histórica | Ingestão em lote do histórico de chamados existente no gestão frota | Alta |
| 5 | API de log de auditoria | Trilha completa e imutável de eventos consultável externamente para fins de conformidade | Média |
| 6 | Portal do cliente | Área de autoatendimento para clientes acompanharem seus próprios chamados (movido da Fase 3) | Baixa |

---

## Fase 6 — Comunicações (E-mail)
> Objetivo: notificações proativas e interação por e-mail — depende da disponibilidade do servidor de e-mail da empresa.

| # | Funcionalidade | Descrição |
|---|----------------|-----------|
| 1 | Notificação por e-mail: atribuição | Notificar o agente quando um chamado for atribuído a ele |
| 2 | Notificação por e-mail: novo chamado | Notificar time/admin quando um chamado de alta prioridade chegar |
| 3 | Notificação por e-mail: SLA vencido | Alertar agente e gestor quando o prazo de SLA for ultrapassado |
| 4 | Digest por e-mail | Resumo diário/semanal de chamados abertos, vencidos e resolvidos para gestores |
| 5 | Notificação por e-mail: @menção | Notificar o agente por e-mail quando @mencionado em uma nota interna — complementa a central de notificações in-app (3.6.1) |
| 6 | E-mail de entrada | Receber respostas do cliente por e-mail e encadeá-las de volta na conversa do chamado |

---

## Fase 7 — Inteligência (ML/IA)
> Objetivo: evoluir de fluxos reativos baseados em regras para assistência proativa e orientada a dados — sem substituir a lógica explicável onde auditabilidade é essencial.
>
> **Pré-requisito:** os dados de analytics da Fase 4 devem existir e ser suficientemente ricos (mínimo ~6 meses de histórico em produção) antes que o treinamento seja viável.
>
> **Antes de implementar qualquer item aqui:** leia o [ADR-008](adr/008_analytics_ml_extension_points.md). A API de analytics já expõe `features{}` por agente (para 7.4 e 7.5), `insights[]` no overview (para injeção de anomalias), `meta{}` para signals de predição e o namespace reservado `/v1/analytics/predictions/` para novos endpoints — tudo sem tocar nos consumidores existentes.

| # | Funcionalidade | Descrição | Prioridade |
|---|----------------|-----------|------------|
| 1 | Sugestão automática de prioridade | Na ingestão do chamado, sugerir prioridade com base no texto do título/descrição e padrões históricos da fonte — agente pode aceitar ou substituir | Alta |
| 2 | Categorização automática (tipo) | Classificar o `type` do chamado (bug / melhoria / dúvida / suporte) automaticamente a partir do texto livre usando um classificador ajustado — reduz triagem manual | Alta |
| 3 | Escalonamento proativo de SLA | Estender o motor de escalonamento baseado em regras (3.8) com um sinal de ML: escalonar chamados com previsão de breach mesmo sem regra determinística disparada | Média |
| 4 | Preditor de nota CSAT | Prever a nota de satisfação esperada antes do envio da pesquisa, com base em tempo de resolução, número de respostas, agente e tipo — destaca clientes possivelmente insatisfeitos para follow-up proativo. Consumir `features{}` de `GET /v1/analytics/agent/{id}` — ver [ADR-008 §1](adr/008_analytics_ml_extension_points.md). | Média |
| 5 | Balanceador de carga do agente | Sugerir o atribuído ideal para novos chamados com base na fila atual, velocidade histórica de resolução por tipo e disponibilidade do agente. Consumir `features.currently_open` e `features.avg_mttr_hours` da API de analytics — ver [ADR-008 §1](adr/008_analytics_ml_extension_points.md). | Média |
| 6 | Análise de sentimento nas respostas | Detectar frustração ou urgência nas mensagens do cliente e sinalizar o chamado visualmente — complementa o CSAT ao identificar clientes insatisfeitos antes do fechamento | Baixa |
| 7 | Detecção de duplicatas | Sugerir automaticamente a mesclagem de novos chamados semanticamente similares a chamados abertos — estende a funcionalidade de mesclagem manual (3.7) | Baixa |
