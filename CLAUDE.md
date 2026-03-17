# Aegis — Claude Context

## What This Project Is

**Centralized ticket & incident management platform.**
Unified inbox for teams managing support tickets across multiple isolated system instances.

Real origin: fleet management system (gestão frota) deployed to multiple clients — each with
its own support ticket module. Team needed one place to see and manage all tickets.

Aegis receives tickets from external systems via webhook/API and provides a unified dashboard.
It does NOT know the internals of source systems — it only receives structured payloads.

## Stack

- **Backend**: Python 3.11+, FastAPI, SQLAlchemy 2.0, Alembic, PostgreSQL, Redis
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, TanStack Query
- **Auth**: JWT (dashboard users) + API Keys (ingest sources)
- **Testing**: pytest + httpx (async)
- **Tooling**: Ruff (lint + format), mypy, GitHub Actions CI

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
├── requirements.txt
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

# Run API locally
cd api && uvicorn app.main:app --reload

# Run migrations
cd api && alembic upgrade head

# Before committing
ruff check api/ && ruff format --check api/
mypy api/app/
pytest api/tests/
```

## Key Docs

- `docs/vision.md` — product vision and positioning
- `docs/roadmap.md` — phases with GitHub issue numbers
