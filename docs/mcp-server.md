# Aegis MCP Server

Servidor MCP que integra o Aegis ao Claude Code, permitindo consultar e gerenciar tickets diretamente no chat.

## Setup

Veja [mcp/README.md](../mcp/README.md) para instalação e configuração.

---

## Ferramentas disponíveis

### `list_tickets`

Lista tickets com filtros opcionais.

**Filtros:**

| Parâmetro | Tipo | Valores aceitos | Descrição |
|---|---|---|---|
| `status` | string | `open`, `in_progress`, `resolved`, `closed` | Filtra por status |
| `priority` | string | `low`, `medium`, `high`, `urgent` | Filtra por prioridade |
| `search` | string | qualquer texto | Busca no assunto e descrição |
| `active_only` | boolean | `true` / `false` | Apenas tickets abertos ou em andamento |
| `unassigned` | boolean | `true` / `false` | Apenas tickets sem responsável |
| `limit` | integer | 1–50 (padrão: 20) | Quantidade máxima de resultados |

**Exemplos de uso:**

```
"Quais tickets estão abertos?"
"Me mostra os tickets urgentes não atribuídos"
"Tem algum ticket relacionado a login?"
"Liste os 5 tickets de maior prioridade em andamento"
```

---

### `get_ticket`

Retorna os detalhes completos de um ticket: informações gerais, checklist de progresso (quando houver), histórico de conversa e notas internas.

**Parâmetros:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `ticket_id` | integer | ✅ | ID numérico do ticket |
| `messages_limit` | integer | — | Quantas mensagens recentes incluir (padrão: 10) |

**Exemplos de uso:**

```
"Me dá os detalhes do ticket 42"
"Mostra o ticket 15 com as últimas 20 mensagens"
"O que está acontecendo no ticket SUP-2026-0432?"
```

---

### `add_note`

Adiciona uma nota interna a um ticket. Notas são visíveis apenas para a equipe — não são enviadas ao cliente.

**Parâmetros:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `ticket_id` | integer | ✅ | ID do ticket |
| `body` | string | ✅ | Conteúdo da nota |

**Exemplos de uso:**

```
"Adiciona uma nota no ticket 15 dizendo que o problema foi reproduzido localmente"
"Nota no ticket 8: aguardando retorno do cliente sobre os logs"
```

---

### `update_status`

Altera o status de um ticket.

**Parâmetros:**

| Parâmetro | Tipo | Obrigatório | Valores aceitos |
|---|---|---|---|
| `ticket_id` | integer | ✅ | — |
| `status` | string | ✅ | `open`, `in_progress`, `resolved`, `closed` |

**Exemplos de uso:**

```
"Fecha o ticket 23"
"Coloca o ticket 10 em andamento"
"Marca o ticket 5 como resolvido"
```

---

### `create_ticket`

Abre um ticket interno no Aegis (equivalente a usar "Reportar Problema" no portal).

**Parâmetros:**

| Parâmetro | Tipo | Obrigatório | Valores aceitos | Padrão |
|---|---|---|---|---|
| `subject` | string | ✅ | — | — |
| `description` | string | ✅ | — | — |
| `type` | string | — | `bug`, `improvement`, `suggestion` | `bug` |
| `priority` | string | — | `low`, `medium`, `high`, `urgent` | `medium` |
| `project` | string | — | nome do projeto (aplica a tag correspondente) | — |
| `assign_to_me` | boolean | — | `true` / `false` | `false` |
| `checklist_items` | array de string | — | subtarefas já criadas na abertura, na ordem informada | — |

**Exemplos de uso:**

```
"Abre um bug: login quebrado no Safari, prioridade alta"
"Cria um ticket de melhoria: adicionar paginação na listagem de fontes"
"Reporta um bug urgente: erro 500 ao fechar ticket com anexo"
"Abre um ticket de onboarding do cliente X com as etapas: scripts SQL, sync de veículos, cron, deploy"
```

---

## Checklist de progresso

Quebra um chamado grande (desenho de módulo, onboarding de cliente) em subtarefas marcáveis — o mesmo painel que aparece na lateral do ticket no dashboard. O percentual é sempre derivado (`concluídos/total`), nunca setado à mão. Ver [ADR-010](adr/010-ticket-checklist-progress.md).

Cada alteração dispara o webhook `checklist_updated` com o snapshot completo, então o espelho somente-leitura no Gestão de Frotas acompanha sem trabalho extra.

### Como um item é identificado

`update_checklist_item` e `delete_checklist_item` aceitam **`item_id`** (preciso, obtido via `list_checklist`) ou **`item_text`**. O casamento por texto tenta o texto exato primeiro e, se não achar, substring — sempre ignorando maiúsculas/minúsculas.

Se o texto casar com mais de um item, **a chamada falha listando os candidatos com id e nada é alterado**. É deliberado: marcar o item errado seria silencioso, enquanto um erro que mostra os candidatos custa só mais uma mensagem.

### `list_checklist`

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `ticket_id` | integer | ✅ | ID do ticket |

Saída: progresso (`concluídos/total`) e um item por linha, no formato `[x] #id  texto`.

### `add_checklist_items`

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `ticket_id` | integer | ✅ | ID do ticket |
| `items` | array de string | ✅ | Textos dos itens, na ordem em que devem aparecer |

Os itens entram no fim da checklist existente. A criação é sequencial de propósito: a API deriva a posição de `max(position)+1` a cada request, então requests concorrentes embaralhariam a ordem.

### `update_checklist_item`

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `ticket_id` | integer | ✅ | ID do ticket |
| `item_id` | integer | — | ID do item (use um destes: `item_id` ou `item_text`) |
| `item_text` | string | — | Texto do item |
| `is_done` | boolean | — | `true` marca como concluído, `false` desmarca |
| `text` | string | — | Novo texto do item |

Informe ao menos um de `is_done` / `text` — sem nenhum dos dois a chamada é recusada em vez de virar um no-op silencioso.

### `delete_checklist_item`

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `ticket_id` | integer | ✅ | ID do ticket |
| `item_id` | integer | — | ID do item (use um destes: `item_id` ou `item_text`) |
| `item_text` | string | — | Texto do item |

**Exemplos de uso:**

```
"Quebra o ticket 60 em subtarefas: modelagem, endpoints, tela de cadastro, deploy"
"Como está a checklist do ticket 1049?"
"Marca 'endpoints' como concluído no ticket 60"
"Desmarca o item 3 do ticket 60 — voltou atrás"
"Renomeia o item 'tela de cadastro' do ticket 60 para 'tela de cadastro + validação'"
"Remove o item 'deploy' do ticket 60"
```

### Limitação conhecida

Não há como **reordenar** itens: a `position` só é escrita na criação e o `PATCH` da API não a aceita. Reordenar exigiria endpoint novo — a ordem é definida pela ordem em que os itens são adicionados.
