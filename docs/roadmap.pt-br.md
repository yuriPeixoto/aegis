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

## Fase 3 — Central de Suporte Completa
> Objetivo: Aegis se torna uma central de suporte completa — à altura do Zendesk/Freshdesk, adaptada a este ecossistema.

| # | Funcionalidade | Descrição | Status |
|---|----------------|-----------|--------|
| 1 | Relatar um problema | Opção interna de gerar um chamado de dentro do Aegis | ✅ |
| 2 | Fechamento automático | Fechar automaticamente chamados inativos além de um prazo configurável | ✅ |
| 3 | Operações em lote | Atribuir, fechar e alterar prioridade em massa direto da inbox | ✅ |
| 4 | Respostas prontas | Templates de resposta pré-escritos para problemas recorrentes | ✅ |
| 5 | Etiquetas de chamado | Rótulos livres para classificação e filtragem | Média |
| 6 | Notas internas na conversa | Notas visíveis apenas para o time, intercaladas na visualização da conversa | Média |
| 7 | Mesclagem de chamados | Mesclar chamados duplicados do mesmo cliente | Média |
| 8 | Regras de escalonamento | Escalonar automaticamente chamados vencidos ou de alta prioridade para agente sênior | Média |
| 9 | Visões customizadas / filtros salvos | Salvar um conjunto de filtros como uma visão nomeada (ex.: "Urgentes sem atribuição") | Média |
| 10 | CSAT (pesquisa de satisfação) | Breve pedido de feedback enviado ao cliente ao fechar o chamado | Baixa |
| 11 | Portal do cliente | Área de autoatendimento para clientes acompanharem seus próprios chamados | Baixa |

---

## Fase 4 — Analytics e Relatórios
> Objetivo: visibilidade sobre os padrões de suporte e a performance do time.

| # | Funcionalidade | Descrição | Prioridade |
|---|----------------|-----------|------------|
| 1 | API de analytics | MTTR por fonte/tipo/prioridade, tendências de volume, conformidade de SLA ao longo do tempo | Alta |
| 2 | Dashboard de relatórios | Gráficos (Recharts): volume de chamados, tempo de resolução, taxa de SLA, breakdown por agente | Alta |
| 3 | Seletor de período | Filtrar todas as métricas do dashboard por intervalo de datas configurável | Alta |
| 4 | Exportação CSV | Exportar lista filtrada de chamados ou resumo de relatório para CSV | Média |
| 5 | Relatório em PDF | Resumo executivo com gráficos (ReportLab / WeasyPrint) | Média |
| 6 | Insights automáticos | "Tipo X aumentou 40% este mês no Cliente Y" — detectar anomalias automaticamente | Baixa |

---

## Fase 5 — Integração com o Ecossistema
> Objetivo: conectar o Aegis ao restante do ecossistema interno.

| # | Funcionalidade | Descrição |
|---|----------------|-----------|
| 1 | Integração Maestro | Receber webhooks de anomalia como chamados de incidente automáticos |
| 2 | Integração Orquestra | Decisões de governança geram chamados rastreáveis no Aegis |
| 3 | Webhook de saída genérico | Webhooks de saída configuráveis por tipo de evento para qualquer fonte |
| 4 | Importação histórica | Ingestão em lote do histórico de chamados existente no gestão frota |
| 5 | API de log de auditoria | Trilha completa e imutável de eventos consultável externamente para fins de conformidade |

---

## Fase 6 — Comunicações (E-mail)
> Objetivo: notificações proativas e interação por e-mail — depende da disponibilidade do servidor de e-mail da empresa.

| # | Funcionalidade | Descrição |
|---|----------------|-----------|
| 1 | Notificação por e-mail: atribuição | Notificar o agente quando um chamado for atribuído a ele |
| 2 | Notificação por e-mail: novo chamado | Notificar time/admin quando um chamado de alta prioridade chegar |
| 3 | Notificação por e-mail: SLA vencido | Alertar agente e gestor quando o prazo de SLA for ultrapassado |
| 4 | Digest por e-mail | Resumo diário/semanal de chamados abertos, vencidos e resolvidos para gestores |
| 5 | E-mail de entrada | Receber respostas do cliente por e-mail e encadeá-las de volta na conversa do chamado |

---

## Fase 7 — Suporte Interno (Aegis-on-Aegis) ✅
> Objetivo: transformar o Aegis em sua própria ferramenta de melhoria e feedback.

| # | Funcionalidade | Descrição | Status |
|---|----------------|-----------|--------|
| 1 | Documentar proposta | Analisar ferramentas e definir estrutura de tickets internos | ✅ |
| 2 | Source 'Aegis' | Criar e garantir a fonte de dados interna no banco | ✅ |
| 3 | Endpoint de criação | API para usuários autenticados criarem chamados sem chave externa | ✅ |
| 4 | UI de criação | Modal e botão flutuante para feedback rápido dentro da ferramenta | ✅ |
| 5 | Notificação interna | Notificar admins sobre novos feedbacks de agentes | ⏳ |

---
