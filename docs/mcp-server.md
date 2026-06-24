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

Retorna os detalhes completos de um ticket: informações gerais, histórico de conversa e notas internas.

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

**Exemplos de uso:**

```
"Abre um bug: login quebrado no Safari, prioridade alta"
"Cria um ticket de melhoria: adicionar paginação na listagem de fontes"
"Reporta um bug urgente: erro 500 ao fechar ticket com anexo"
```
