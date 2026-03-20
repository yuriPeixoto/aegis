# Aegis — Roadmap

## Phase 1 — Foundation & Unified Inbox ✅
> Goal: solve the immediate business problem — one place to see all tickets from all gestão frota instances.
> **Completed:** 2026-03-19

| # | Issue | Status | Type |
|---|-------|--------|------|
| 1 | Project setup: FastAPI + SQLAlchemy + Alembic + PostgreSQL + CI | ✅ | infra |
| 2 | Source management: register sources, generate and validate API keys | ✅ | feature |
| 3 | Database schema: sources, tickets, ticket_events, users migrations (001–008) | ✅ | infra |
| 4 | Ingest API: `POST /v1/ingest/tickets` and `POST /v1/ingest/tickets/events` | ✅ | feature |
| 5 | Ticket read API: list with filters + pagination + detail | ✅ | feature |
| 6 | Auth: JWT login, `/me` endpoint, roles (admin/agent/viewer) | ✅ | feature |
| 7 | Frontend setup: Vite + React 18 + TS + Tailwind + TanStack Query + i18next | ✅ | infra |
| 8 | Frontend: unified inbox — filters, queue tabs, ticket detail panel | ✅ | feature |
| 9 | gestão frota integration: `SendTicketToAegis` job + enum mapping | ✅ | feature |
| 10 | Roles + assignment: `role` on users, `assigned_to_user_id` on tickets, PATCH assign | ✅ | feature |
| 11 | i18n: EN/PT-BR via react-i18next | ✅ | feature |
| 12 | Settings: client (source) management UI with API key generation (admin only) | ✅ | feature |
| 13 | ADRs: 001–006 | ✅ | docs |

---

## Phase 2 — Team Workflow
> Goal: the team can fully manage tickets from inside Aegis. Clients interact in gestão frota and see responses there.

| # | Issue | Type |
|---|-------|------|
| [#33](https://github.com/yuriPeixoto/aegis/issues/33) | User management UI: create/edit agents and admins from Settings | feature |
| [#31](https://github.com/yuriPeixoto/aegis/issues/31) | Manager dashboard: KPIs, unassigned queue, overdue, per-agent and per-client metrics | feature |
| [#27](https://github.com/yuriPeixoto/aegis/issues/27) | Email notifications: assignment, overdue SLA, new ticket — **postergado: aguardando servidor de e-mail da empresa** | feature |
| [#26](https://github.com/yuriPeixoto/aegis/issues/26) | Webhook-out: push status changes, team responses and attachments back to source | feature |
| [#37](https://github.com/yuriPeixoto/aegis/issues/37) | Bidirectional conversation: client replies in GF, team replies in Aegis, both see full thread | feature |
| [#36](https://github.com/yuriPeixoto/aegis/issues/36) | Attachment support: upload/view docs and images on tickets | feature |

---

## Phase 3 — Support Center Completeness
> Goal: Aegis becomes a full-featured support center — on par with what teams expect from tools like Zendesk or Freshdesk, but tailored to this ecosystem.

| Feature | Description |
|---------|-------------|
| SLA policies per client | Configurable SLA per source + ticket type combination |
| Auto-close | Automatically close tickets inactive beyond configurable threshold |
| Canned responses | Pre-written reply templates for common issues |
| Ticket merging | Merge duplicate tickets from the same client |
| Client portal | Self-service view for clients to track their tickets without going through gestão frota |
| Source configuration UI | Manage webhook-out URL, secret, SLA policy, escalation rules per client |
| Escalation rules | Auto-escalate overdue or high-priority tickets to a senior agent or manager |

---

## Phase 4 — Analytics & Reporting
> Goal: visibility into support patterns and team performance.

| Feature | Description |
|---------|-------------|
| Analytics API | MTTR per source/type/priority, volume trends, SLA compliance rate |
| Automatic insights | "Type X up 40% this month at Client Y" |
| PDF report | Executive summary with charts (ReportLab / WeasyPrint) |
| Frontend dashboard | Charts (Recharts), report download trigger |

---

## Phase 5 — Ecosystem Integration
> Goal: connect Aegis to the rest of the ecosystem.

| Feature | Description |
|---------|-------------|
| Maestro integration | Receive anomaly webhooks as automatic incident tickets |
| Orquestra integration | Governance decisions generate Aegis tickets |
| Generic webhook-out | Configurable outbound webhooks per event type for any source |
| Historical import | Bulk ingest from existing gestão frota ticket history |
