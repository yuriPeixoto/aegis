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

## Features

### Core
- **Unified inbox** — all client tickets in one place, with filters, smart sort, and auto-refresh
- **Bidirectional conversation** — client replies in their system, team replies in Aegis; both see the full thread
- **Ticket management** — status, assignment, priority, tags, and full event timeline
- **Attachments** — images, documents, and video support
- **Internal notes** — team-only context interleaved in the timeline, with @mention of agents
- **Notification center** — bell icon with unread badge; click navigates to ticket and marks as read
- **Browser notifications** — OS-level alert for high/urgent tickets, even when Aegis is not the active tab

### Workflow
- **SLA tracking** — business-hours policies, holidays, pause/resume, admin override; on-time / at-risk / overdue indicators
- **Escalation rules** — automatic escalation based on SLA and configurable conditions
- **Canned responses** — reusable reply templates for common issues
- **Saved views** — save any filter set as a named view (e.g. "Urgent unassigned")
- **Bulk operations** — bulk assign, close, or change priority from the inbox
- **Auto-close** — automatically close tickets inactive beyond a configurable threshold
- **Ticket merging** — merge duplicate tickets; messages consolidated, irreversible
- **Report an Issue** — internal option to generate a ticket directly from within Aegis
- **CSAT** — short satisfaction survey sent to client on ticket close, with bidirectional webhook flow

### Visibility
- **Manager dashboard** — KPIs, queue metrics, overdue tickets, unassigned items
- **Agent profile page** — per-agent KPIs, volume trend, workload charts, full ticket history
- **Reports dashboard** — ticket volume, resolution time, SLA rate, by-agent and by-source breakdown
- **Analytics API** — MTTR, SLA compliance over time, date-range filters, ML extension points

### Operations
- **Team calendar** — on-call schedule (Saturdays) and client training sessions, with role-based creation
- **User management** — create/edit/activate agents and admins from Settings (admin only)
- **Source management** — register clients, generate API keys, configure webhooks per source
- **Webhook ingestion** — external systems push tickets via `POST /v1/ingest/tickets` + API key
- **Webhook-out** — push status changes and team replies back to the source system
- **i18n** — EN / PT-BR via react-i18next

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
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

## Roadmap

See [`docs/roadmap.md`](docs/roadmap.md) for full details and feature breakdown.

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Foundation & Unified Inbox | ✅ Complete |
| 2 | Team Workflow | ✅ Complete |
| 3 | Support Center Completeness | ✅ Complete |
| 4 | Analytics & Reporting | 🔄 In progress |
| 4.5 | Team Calendar | ✅ Complete |
| 5 | Ecosystem Integration | Planned |
| 6 | Communications (Email) | Planned |
| 7 | Intelligence (ML/AI) | Planned |
