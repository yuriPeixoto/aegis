# Proposta: Tickets de Suporte Internos (Aegis-on-Aegis)

## 1. Motivação
Atualmente, o Aegis atua como uma inbox unificada para sistemas externos (como o Gestão Frota). No entanto, para que o time de suporte e desenvolvimento possa reportar melhorias, bugs e sugestões do próprio Aegis, precisamos de uma funcionalidade de "auto-ticket".

Inspirado em ferramentas como **Zendesk** (que usa sua própria plataforma para suporte), **Linear** (foco em feedback rápido e issues internas) e **GitHub Issues**, propomos a implementação de uma origem interna de dados.

## 2. Referências de Mercado
- **Zendesk:** Permite que agentes criem tickets manualmente para outros departamentos ou para registrar interações offline.
- **Linear:** Foca em "Capture everything". Atalhos rápidos (tecla `C`) para criar issues de qualquer lugar, com captura automática de contexto.
- **Intercom:** Botão de "Report a bug" que já anexa metadados da sessão do usuário.

## 3. Arquitetura Proposta

### 3.1. A Source 'Aegis'
Para manter a consistência com o motor de ingestão atual, criaremos uma `Source` especial no banco de dados:
- **Nome:** Aegis Internal
- **Slug:** `aegis`
- **Tipo:** Internal (Nova flag ou tratamento especial para não exigir API Key externa).

### 3.2. Fluxo de Criação
No Frontend, adicionaremos um botão global (ou atalho) para "Novo Chamado de Melhoria".
1. **Ator:** Qualquer usuário autenticado no Aegis (Agente, Admin).
2. **Dados:** Assunto, Descrição, Tipo (Bug/Melhoria/Sugestão) e Prioridade.
3. **Contexto Automático:** Versão do frontend, URL atual, navegador e ID do usuário que reportou.

### 3.3. API (Mudanças Necessárias)
- Criar um novo endpoint `POST /v1/tickets/internal` que:
  - Não exige `X-API-Key` externa, mas sim um token de usuário logado.
  - Atribui automaticamente o `source_id` da fonte interna 'Aegis'.
  - Gera um `external_id` único com prefixo (ex: `AEGIS-123`).

## 4. UX/UI
- **Botão flutuante ou no Sidebar:** "Reportar Problema / Sugerir Melhoria".
- **Modal de Criação:** Simples, com suporte a drag-and-drop de prints/anexos.
- **Visualização na Inbox:** Aparecerá como qualquer outro ticket, permitindo que o time de DevOps/Product atribua a si mesmo e gerencie o ciclo de vida.

## 5. Roadmap Sugerido (Fase 7?)
1. **Migration:** Script para garantir a existência da Source 'Aegis'.
2. **Backend:** Endpoint de criação interna.
3. **Frontend:** Modal de criação e botão de gatilho.
4. **Notificações:** Alertar admins quando um ticket 'Aegis' for criado.

---
**Status:** Implantado em 27/03/2026.
