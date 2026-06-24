# Aegis MCP Server

Servidor MCP que conecta Claude Code ao Aegis, permitindo consultar, criar e gerenciar tickets diretamente do chat.

## Pré-requisitos

- Python 3.11+
- Aegis rodando localmente ou em produção
- Claude Code CLI instalado

## Instalação

```bash
cd aegis/mcp
pip install -r requirements.txt
```

## Configuração

O servidor suporta dois modos de autenticação.

### Opção 1 — Token JWT (recomendado)

Obtenha seu token via curl ou qualquer cliente HTTP:

```bash
curl -X POST http://localhost:8000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "seu@email.com", "password": "suasenha"}'
```

Copie o `access_token` retornado.

### Opção 2 — Email + Senha

O servidor faz login automaticamente no startup. Útil para desenvolvimento.

## Registrar no Claude Code

Edite `~/.claude.json` e adicione em `mcpServers`:

```json
{
  "mcpServers": {
    "aegis": {
      "command": "python",
      "args": ["/caminho/absoluto/para/aegis/mcp/server.py"],
      "env": {
        "AEGIS_BASE_URL": "http://localhost:8000",
        "AEGIS_TOKEN": "seu-jwt-aqui"
      }
    }
  }
}
```

**Com email/senha:**

```json
{
  "mcpServers": {
    "aegis": {
      "command": "python",
      "args": ["/caminho/absoluto/para/aegis/mcp/server.py"],
      "env": {
        "AEGIS_BASE_URL": "http://localhost:8000",
        "AEGIS_EMAIL": "seu@email.com",
        "AEGIS_PASSWORD": "suasenha"
      }
    }
  }
}
```

Após salvar, reinicie o Claude Code. O servidor aparecerá como ferramenta disponível.

## Ferramentas disponíveis

| Ferramenta | Descrição |
|---|---|
| `list_tickets` | Lista tickets com filtros (status, prioridade, busca) |
| `get_ticket` | Detalhe completo: info + conversa + notas internas |
| `add_note` | Adiciona nota interna a um ticket |
| `update_status` | Altera o status do ticket |
| `create_ticket` | Abre um ticket interno (bug, melhoria, sugestão) |

## Exemplos de uso no Claude Code

```
"Quais tickets estão abertos e não atribuídos?"
"Me mostra os detalhes do ticket 42 com a conversa completa."
"Adiciona uma nota no ticket 15 dizendo que o problema foi reproduzido."
"Fecha o ticket 23."
"Abre um ticket de bug: login quebrado no Safari, prioridade alta."
```
