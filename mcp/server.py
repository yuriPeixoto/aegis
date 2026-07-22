"""Aegis MCP Server — expõe operações de ticketing para Claude Code."""
from __future__ import annotations

import asyncio
import os
import textwrap
from typing import Any

import httpx
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp import types

BASE_URL = os.environ.get("AEGIS_BASE_URL", "http://localhost:8000").rstrip("/")
API_KEY: str | None = os.environ.get("AEGIS_API_KEY")  # preferido: chave pessoal, não expira
TOKEN: str | None = None  # fallback (AEGIS_TOKEN ou login), preenchido no startup


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

def _auth_header() -> dict[str, str]:
    if API_KEY:
        return {"X-Aegis-Key": API_KEY}
    return {"Authorization": f"Bearer {TOKEN}"}


def _headers() -> dict[str, str]:
    return {**_auth_header(), "Content-Type": "application/json"}


async def _get(path: str, params: dict | None = None) -> Any:
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(f"{BASE_URL}/v1{path}", headers=_headers(), params=params)
        r.raise_for_status()
        return r.json()


async def _post(path: str, body: dict) -> Any:
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(f"{BASE_URL}/v1{path}", headers=_headers(), json=body)
        r.raise_for_status()
        return r.json()


async def _patch(path: str, body: dict) -> Any:
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.patch(f"{BASE_URL}/v1{path}", headers=_headers(), json=body)
        r.raise_for_status()
        return r.json()


# ---------------------------------------------------------------------------
# Auth: AEGIS_API_KEY (recomendado) > AEGIS_TOKEN (JWT, expira) > login com senha
# ---------------------------------------------------------------------------
#
# AEGIS_API_KEY é o caminho recomendado: gere em POST /v1/auth/api-key (ou pela
# UI, se disponível) e nunca expira até ser rotacionada/revogada. Não requer
# guardar a senha da conta em lugar nenhum. AEGIS_TOKEN e AEGIS_EMAIL+
# AEGIS_PASSWORD seguem funcionando como fallback para compatibilidade.

async def _resolve_token() -> str:
    env_token = os.environ.get("AEGIS_TOKEN")
    if env_token:
        return env_token

    email = os.environ.get("AEGIS_EMAIL")
    password = os.environ.get("AEGIS_PASSWORD")
    if not email or not password:
        raise RuntimeError(
            "Configure AEGIS_API_KEY (recomendado), AEGIS_TOKEN, ou "
            "(AEGIS_EMAIL + AEGIS_PASSWORD) nas variáveis de ambiente."
        )

    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(
            f"{BASE_URL}/v1/auth/login",
            json={"email": email, "password": password},
        )
        r.raise_for_status()
        return r.json()["access_token"]


# ---------------------------------------------------------------------------
# Formatters — transforma respostas da API em texto legível para o LLM
# ---------------------------------------------------------------------------

def _fmt_ticket(t: dict) -> str:
    assigned = t.get("assigned_to") or {}
    tags = ", ".join(tag["name"] for tag in t.get("tags", [])) or "—"
    sla = t.get("sla_due_at") or "—"
    return textwrap.dedent(f"""\
        ID: {t['id']}  |  Ref: {t['external_id']}
        Assunto: {t['subject']}
        Status: {t['status']}  |  Prioridade: {t.get('priority') or '—'}  |  Tipo: {t.get('type') or '—'}
        Cliente (source): {t.get('source_name', '—')}
        Responsável: {assigned.get('name', 'não atribuído')}
        Tags: {tags}
        SLA vence em: {sla}
    """).strip()


def _fmt_message(m: dict) -> str:
    direction = "↑ Equipe" if m["direction"] == "outbound" else "↓ Cliente"
    internal = " [nota interna]" if m.get("is_internal") else ""
    return f"[{m['created_at'][:19]}] {direction} — {m['author_name']}{internal}\n{m['body']}"


# ---------------------------------------------------------------------------
# MCP Server
# ---------------------------------------------------------------------------

server = Server("aegis")


@server.list_tools()
async def _list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="list_tickets",
            description=(
                "Lista tickets do Aegis com filtros opcionais. "
                "Use para ver tickets abertos, atribuídos a alguém, por status, prioridade ou busca textual."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "description": "Filtrar por status: open, in_progress, resolved, closed",
                    },
                    "priority": {
                        "type": "string",
                        "description": "Filtrar por prioridade: low, medium, high, urgent",
                    },
                    "search": {
                        "type": "string",
                        "description": "Busca textual no assunto e descrição",
                    },
                    "active_only": {
                        "type": "boolean",
                        "description": "Se true, retorna apenas tickets abertos/em andamento (default: false)",
                    },
                    "unassigned": {
                        "type": "boolean",
                        "description": "Se true, retorna apenas tickets sem responsável",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Quantidade máxima de resultados (default: 20, max: 50)",
                        "default": 20,
                    },
                },
                "additionalProperties": False,
            },
        ),
        types.Tool(
            name="get_ticket",
            description=(
                "Retorna os detalhes completos de um ticket, incluindo as últimas mensagens "
                "da conversa e notas internas."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "ticket_id": {
                        "type": "integer",
                        "description": "ID numérico do ticket (ex: 42)",
                    },
                    "messages_limit": {
                        "type": "integer",
                        "description": "Quantas mensagens recentes incluir (default: 10)",
                        "default": 10,
                    },
                },
                "required": ["ticket_id"],
                "additionalProperties": False,
            },
        ),
        types.Tool(
            name="add_note",
            description="Adiciona uma nota interna a um ticket (visível apenas para a equipe).",
            inputSchema={
                "type": "object",
                "properties": {
                    "ticket_id": {"type": "integer", "description": "ID do ticket"},
                    "body": {"type": "string", "description": "Conteúdo da nota"},
                },
                "required": ["ticket_id", "body"],
                "additionalProperties": False,
            },
        ),
        types.Tool(
            name="update_status",
            description="Altera o status de um ticket.",
            inputSchema={
                "type": "object",
                "properties": {
                    "ticket_id": {"type": "integer", "description": "ID do ticket"},
                    "status": {
                        "type": "string",
                        "enum": ["open", "in_progress", "resolved", "closed"],
                        "description": "Novo status do ticket",
                    },
                },
                "required": ["ticket_id", "status"],
                "additionalProperties": False,
            },
        ),
        types.Tool(
            name="create_ticket",
            description="Cria um ticket interno no Aegis (equivalente a 'Reportar Problema').",
            inputSchema={
                "type": "object",
                "properties": {
                    "subject": {"type": "string", "description": "Resumo do problema"},
                    "description": {"type": "string", "description": "Descrição detalhada"},
                    "type": {
                        "type": "string",
                        "enum": ["bug", "improvement", "suggestion"],
                        "description": "Tipo do ticket (default: bug)",
                        "default": "bug",
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["low", "medium", "high", "urgent"],
                        "description": "Prioridade (default: medium)",
                        "default": "medium",
                    },
                    "assign_to_me": {
                        "type": "boolean",
                        "description": "Se true, atribui o ticket ao usuário autenticado no MCP (default: false)",
                        "default": False,
                    },
                    "project": {
                        "type": "string",
                        "enum": [
                            "Gestão de Frotas",
                            "Checklist Suite",
                            "Jornada Cliente",
                            "Jornada Unitop",
                            "Telemetria",
                            "Aegis",
                            "Painel de Motoristas",
                        ],
                        "description": (
                            "Projeto ao qual a tarefa pertence — anexa a tag correspondente "
                            "(já cadastrada no Aegis com a mesma cor usada no Google Calendar). "
                            "Usado pelo weekly-report pra agrupar o relatório por projeto."
                        ),
                    },
                },
                "required": ["subject", "description"],
                "additionalProperties": False,
            },
        ),
        types.Tool(
            name="list_tags",
            description="Lista as tags cadastradas no Aegis (nome, cor, descrição).",
            inputSchema={"type": "object", "properties": {}, "additionalProperties": False},
        ),
        types.Tool(
            name="set_tag_color",
            description=(
                "Cria ou atualiza a cor de uma tag (ex: um novo projeto). "
                "Requer conta admin no Aegis."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Nome exato da tag"},
                    "color": {
                        "type": "string",
                        "description": "Cor em hex (ex: #46d6db). Se a tag não existir, é criada.",
                    },
                    "description": {"type": "string", "description": "Descrição opcional"},
                },
                "required": ["name", "color"],
                "additionalProperties": False,
            },
        ),
    ]


@server.call_tool()
async def _call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    try:
        result = await _dispatch(name, arguments)
    except httpx.HTTPStatusError as exc:
        result = f"Erro HTTP {exc.response.status_code}: {exc.response.text[:300]}"
    except Exception as exc:
        result = f"Erro: {exc}"

    return [types.TextContent(type="text", text=result)]


async def _dispatch(name: str, args: dict) -> str:
    if name == "list_tickets":
        params: dict = {}
        for key in ("status", "priority", "search", "active_only", "unassigned"):
            if args.get(key) is not None:
                params[key] = args[key]
        params["limit"] = min(int(args.get("limit", 20)), 50)

        data = await _get("/tickets", params=params)
        items = data.get("items", [])
        total = data.get("total", 0)

        if not items:
            return "Nenhum ticket encontrado com os filtros informados."

        lines = [f"Encontrados {total} ticket(s). Exibindo {len(items)}:\n"]
        for t in items:
            lines.append(_fmt_ticket(t))
            lines.append("")
        return "\n".join(lines).strip()

    if name == "get_ticket":
        ticket_id = int(args["ticket_id"])
        msg_limit = int(args.get("messages_limit", 10))

        ticket, all_messages = await asyncio.gather(
            _get(f"/tickets/{ticket_id}"),
            _get(f"/tickets/{ticket_id}/messages"),
        )

        public_msgs = [m for m in all_messages if not m.get("is_internal")]
        internal_msgs = [m for m in all_messages if m.get("is_internal")]

        lines = ["=== TICKET ===", _fmt_ticket(ticket), ""]

        if ticket.get("description"):
            lines += ["=== DESCRIÇÃO ===", ticket["description"], ""]

        recent_public = public_msgs[-msg_limit:] if len(public_msgs) > msg_limit else public_msgs
        if recent_public:
            lines.append(f"=== CONVERSA (últimas {len(recent_public)} mensagens) ===")
            for m in recent_public:
                lines.append(_fmt_message(m))
                lines.append("")

        if internal_msgs:
            lines.append("=== NOTAS INTERNAS ===")
            for m in internal_msgs:
                lines.append(_fmt_message(m))
                lines.append("")

        return "\n".join(lines).strip()

    if name == "add_note":
        ticket_id = int(args["ticket_id"])
        note = await _post(f"/tickets/{ticket_id}/notes", {"body": args["body"]})
        return f"Nota adicionada ao ticket #{ticket_id} (ID da nota: {note['id']})."

    if name == "update_status":
        ticket_id = int(args["ticket_id"])
        new_status = args["status"]
        ticket = await _patch(f"/tickets/{ticket_id}/status", {"status": new_status})
        return f"Ticket #{ticket_id} atualizado: status = {ticket['status']}."

    if name == "create_ticket":
        import httpx as _httpx
        form = {
            "subject": args["subject"],
            "description": args["description"],
            "type": args.get("type", "bug"),
            "priority": args.get("priority", "medium"),
            "assign_to_me": str(args.get("assign_to_me", False)).lower(),
        }
        if args.get("project"):
            form["project"] = args["project"]
        async with _httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                f"{BASE_URL}/v1/tickets/internal",
                headers=_auth_header(),
                data=form,
            )
            r.raise_for_status()
            ticket = r.json()
        tags = ", ".join(tag["name"] for tag in ticket.get("tags", [])) or "—"
        return (
            f"Ticket criado com sucesso!\n"
            f"ID: {ticket['id']}  |  Ref: {ticket['external_id']}\n"
            f"Assunto: {ticket['subject']}\n"
            f"Tags: {tags}"
        )

    if name == "list_tags":
        tags = await _get("/tags")
        if not tags:
            return "Nenhuma tag cadastrada."
        lines = [f"{t['id']:>3}  {t['color']}  {t['name']}" for t in tags]
        return "\n".join(lines)

    if name == "set_tag_color":
        tags = await _get("/tags")
        existing = next((t for t in tags if t["name"] == args["name"]), None)

        body = {"color": args["color"]}
        if args.get("description"):
            body["description"] = args["description"]

        if existing:
            tag = await _patch(f"/tags/{existing['id']}", body)
            return f"Tag '{tag['name']}' atualizada: cor = {tag['color']}."

        body["name"] = args["name"]
        tag = await _post("/tags", body)
        return f"Tag '{tag['name']}' criada: cor = {tag['color']}."

    return f"Ferramenta desconhecida: {name}"


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

async def main() -> None:
    global TOKEN
    if not API_KEY:
        TOKEN = await _resolve_token()

    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options(),
        )


if __name__ == "__main__":
    asyncio.run(main())
