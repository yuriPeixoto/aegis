# Aegis

> Centralized ticket & incident management — unified inbox for multi-instance support operations.

Aegis solves the problem of teams managing the same software deployed across multiple client
sites, each with its own support ticket system. Instead of logging into 3, 4, or 5 different
systems, the team works from a single inbox — with SLA tracking, analytics, and automatic
incident creation from infrastructure monitoring.

## Stack

| Layer | Technology |
|-------|-----------|
| API | Python 3.11+, FastAPI, SQLAlchemy 2.0, Alembic |
| Database | PostgreSQL |
| Frontend | React 18, TypeScript, Vite, TailwindCSS, TanStack Query |
| Auth | JWT (dashboard) + API Keys (ingestion) |
| Testing | pytest, httpx |

## How It Works

External systems push tickets to Aegis via a simple REST API:

```bash
curl -X POST https://aegis.example.com/v1/ingest/tickets \
  -H "X-Aegis-Key: <api_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "external_id": "SUP-2026-0042",
    "type": "bug",
    "priority": "high",
    "status": "open",
    "subject": "Error on vehicle checkout",
    "description": "..."
  }'
```

The team manages everything from the Aegis dashboard — no source system access needed for
support operations.

## Getting Started

```bash
# API
cd api
cp .env.example .env   # fill in your credentials
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

## Roadmap

See [`docs/roadmap.md`](docs/roadmap.md) for all phases.

- **Phase 1** — Foundation & Unified Inbox (MVP)
- **Phase 2** — Team Workflow (comments, SLA, notifications)
- **Phase 3** — Analytics & Reporting
- **Phase 4** — Ecosystem Integration (Maestro, Orquestra)
- **Phase 5** — Data Import & Advanced Analytics
