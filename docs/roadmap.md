# Aegis — Roadmap

## Phase 1 — Foundation & Unified Inbox (MVP) ✅
> Goal: solve the immediate business problem — one place to see all tickets from all gestão frota instances.
> **Completed:** 2026-03-19

| # | Issue | Status | Type |
|---|-------|--------|------|
| 1 | Project setup: FastAPI + SQLAlchemy + Alembic + PostgreSQL + CI | ✅ | infra |
| 2 | Source management: register sources, generate and validate API keys | ✅ | feature |
| 3 | Database schema: sources, tickets, ticket_events, users migrations (001–006) | ✅ | infra |
| 4 | Ingest API: `POST /v1/ingest/tickets` and `POST /v1/ingest/tickets/events` | ✅ | feature |
| 5 | Ticket read API: list with filters + pagination + detail | ✅ | feature |
| 6 | Auth: JWT login, `/me` endpoint, roles (admin/agent/viewer) | ✅ | feature |
| 7 | Frontend setup: Vite + React 18 + TS + Tailwind + TanStack Query + i18next | ✅ | infra |
| 8 | Frontend: unified inbox — filters, queue tabs, ticket detail panel | ✅ | feature |
| 9 | gestão frota integration: `SendTicketToAegis` job + enum mapping + block local actions | ✅ | feature |
| 19 | Roles + assignment: `role` on users, `assigned_to_user_id` on tickets, PATCH assign | ✅ | feature |
| 20 | i18n: EN/PT-BR via react-i18next + LanguageContext + static badge translations | ✅ | feature |
| 10 | ADRs: 001–006 (stack, auth, enums, GF split, i18n, assignment model) | ✅ | docs |

---

## Phase 2 — Team Workflow
> Goal: the team can fully manage tickets from inside Aegis without going back to source systems.

| # | Issue | Type |
|---|-------|------|
| 11 | Ticket status management: team updates status directly in Aegis inbox | feature |
| 12 | Assignment UI: dropdown in inbox to assign/reassign tickets to agents | feature |
| 13 | Manager dashboard: KPIs, unassigned queue, overdue tickets, metrics by client and agent | feature |
| 14 | Ticket comments: internal notes from Aegis team (visible only in Aegis) | feature |
| 15 | SLA tracking: compute elapsed time in business hours, flag overdue tickets | feature |
| 16 | Notification: email/WhatsApp on new ticket, overdue SLA, assignment change | feature |
| 17 | Auto-close: automatically close tickets inactive beyond threshold | feature |
| 18 | Frontend: SLA indicator per ticket (on-time / at-risk / overdue) | feature |
| 19 | Webhook-out: push Aegis status changes back to source system (configurable per source) | feature |

---

## Phase 3 — Analytics & Reporting
> Goal: give the team and management visibility into support patterns and team performance.

| # | Issue | Type |
|---|-------|------|
| 18 | Analytics API: MTTR per source, per type, per priority | feature |
| 19 | Analytics API: volume trends (daily/weekly/monthly) | feature |
| 20 | Analytics API: SLA compliance rate per source | feature |
| 21 | Analytics API: automatic insight detection ("type X up 40% this month") | feature |
| 22 | PDF report generation: executive summary with charts (ReportLab / WeasyPrint) | feature |
| 23 | Frontend: analytics dashboard with charts (Recharts) | feature |
| 24 | Frontend: report download trigger | feature |

---

## Phase 4 — Ecosystem Integration
> Goal: connect Aegis to the rest of the ecosystem — incidents from Maestro, decisions from Orquestra, status sync back to source.

| # | Issue | Type |
|---|-------|------|
| 25 | Maestro integration: receive anomaly webhooks as automatic incident tickets | feature |
| 26 | Webhook-out: push status changes back to source system (configurable per source) | feature |
| 27 | Orquestra integration: governance decisions generate Aegis tickets via API | feature |
| 28 | Generic webhook-out: configurable outbound webhooks per event type | feature |
| 29 | Source configuration UI: manage webhook-out, SLA policy, escalation rules per source | feature |

---

## Phase 5 — Data Import & Advanced Analytics
> Goal: migrate historical data and add ML-based pattern detection.

| # | Issue | Type |
|---|-------|------|
| 30 | CSV/JSON import: bulk ingest from Jira, Zendesk, ServiceNow exports | feature |
| 31 | Import pipeline: async processing with progress tracking (Celery + Redis) | infra |
| 32 | ML: anomaly detection on ticket volume patterns (scikit-learn) | feature |
| 33 | ML: category auto-suggestion on ticket ingestion | feature |
| 34 | Multi-source SLA policies: configurable SLA per source + type combination | feature |
