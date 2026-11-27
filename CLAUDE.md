# Aegis — Claude Context

## What This Project Is

**Centralized ticket & incident management platform.**
Unified inbox for teams managing support tickets across multiple isolated system instances.

Real origin: fleet management system (gestão frota) deployed to multiple clients — each with
its own support ticket module. Team needed one place to see and manage all tickets.

Aegis receives tickets from external systems via webhook/API and provides a unified dashboard.
It does NOT know the internals of source systems — it only receives structured payloads.

## Stack

- **Backend**: Python 3.14 (produção), FastAPI, SQLAlchemy 2.1, Alembic, PostgreSQL, PyJWT
- **Dependencies**: `api/pyproject.toml` + `api/uv.lock` (uv); `api/requirements.txt` is exported from the lock for servers without uv
- **Frontend**: React 18, TypeScript 5, Vite 6, Tailwind CSS 3, TanStack Query 5, i18next
- **Auth**: JWT (dashboard users) + API Keys (ingest sources)
- **Testing**: pytest + httpx (async)
- **Tooling**: Ruff (lint + format) and mypy targeting py314, GitHub Actions CI (API and frontend jobs)

## Architecture

```
api/
├── app/
│   ├── core/         # config, database, security, dependencies
│   ├── models/       # SQLAlchemy ORM models
│   ├── schemas/      # Pydantic v2 request/response schemas
│   ├── routers/      # FastAPI routers (ingest, tickets, sources, auth)
│   ├── services/     # Business logic (TicketService, SourceService)
│   └── main.py       # App factory + lifespan
├── alembic/          # Database migrations
├── tests/
├── pyproject.toml    # dependencies (uv), ruff, mypy, pytest
├── uv.lock
├── requirements.txt  # generated: uv export --no-dev --format requirements-txt --frozen -o requirements.txt
└── .env.example
frontend/             # React + TypeScript + Vite
docs/
├── vision.md
├── roadmap.md
└── adr/
```

## Core Concepts

- **Source**: a registered external system (e.g. "gestão frota — Cliente A") with its own API key
- **Ticket**: a support/incident ticket ingested from a source, mirrored in Aegis
- **Event**: a state change pushed by the source (status changed, response added, etc.)
- Aegis is the **system of record for team workflow** — source systems are the origin of tickets

## Integration Contract (gestão frota → Aegis)

```
POST /v1/ingest/tickets          — new ticket created in source
POST /v1/ingest/tickets/events   — ticket updated (status, response, assignment)
Header: X-Aegis-Key: <api_key>
```

Payload shape mirrors the gestão frota SupportTicket model:
- `external_id` (ticket_number: SUP-2026-NNNN)
- `type` (bug | improvement | question | support)
- `priority` (low | medium | high | urgent)
- `status` (the source system's current status string)
- `subject`, `description`
- `source_metadata` (filial, assigned_to, etc. — opaque JSON)

## Workflow

```bash
# Start work
git checkout main && git pull origin main
git checkout -b feature/<slug>

# Set up / refresh the API venv from the lock
cd api && uv sync

# Run API locally
cd api && uv run uvicorn app.main:app --reload

# Run migrations
cd api && uv run alembic upgrade head

# Before committing (same as CI)
cd api && uv run ruff check app tests && uv run ruff format --check app tests
cd api && MYPYPATH=. uv run mypy --config-file pyproject.toml app
cd api && uv run pytest tests/
cd frontend && npm run type-check && npm run lint && npm run build   # PowerShell, not Git Bash

# After changing dependencies
cd api && uv lock && uv export --no-dev --format requirements-txt --frozen -o requirements.txt
```

## Versionamento

Seguimos [Semantic Versioning](https://semver.org/): PATCH para bugfix, MINOR para feature, MAJOR para breaking change.

**A cada novo release, obrigatoriamente:**

1. Atualizar `api/app/core/config.py` → `app_version` e `build_date`
2. Adicionar entrada no topo de `CHANGELOG.md`
3. Adicionar a mesma entrada em `api/app/core/changelog.py` → `APP_CHANGELOG` (mais recente primeiro)
4. Criar tag git: `git tag -a vX.Y.Z -m "vX.Y.Z" && git push --tags`

**Formato da entrada em `APP_CHANGELOG`:**
```python
{
    "version": "1.1.0",
    "date": "2026-MM-DD",
    "highlights": [
        "Descrição curta da melhoria 1",
        "Descrição curta da melhoria 2",
    ],
}
```

A entrada aparece automaticamente na página `/sobre`. Não incluir o v1.0.0 (lançamento inicial) — só versões incrementais.

## Key Docs

- `docs/vision.md` — product vision and positioning
- `docs/roadmap.md` — phases with GitHub issue numbers
