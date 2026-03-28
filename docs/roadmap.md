# Aegis — Roadmap

## Phase 1 — Foundation & Unified Inbox ✅
> Goal: solve the immediate business problem — one place to see all tickets from all gestão frota instances.
> **Completed:** 2026-03-19

| # | Feature | Status | Type | i18n |
|---|---------|--------|------|------|
| 1 | Project setup: FastAPI + SQLAlchemy + Alembic + PostgreSQL + CI | ✅ | infra | — |
| 2 | Source management: register sources, generate and validate API keys | ✅ | feature | — |
| 3 | Database schema: sources, tickets, ticket_events, users migrations | ✅ | infra | — |
| 4 | Ingest API: `POST /v1/ingest/tickets` and `POST /v1/ingest/tickets/events` | ✅ | feature | — |
| 5 | Ticket read API: list with filters + pagination + detail | ✅ | feature | — |
| 6 | Auth: JWT login, `/me` endpoint, roles (admin/agent/viewer) | ✅ | feature | — |
| 7 | Frontend setup: Vite + React 18 + TS + Tailwind + TanStack Query + i18next | ✅ | infra | — |
| 8 | Frontend: unified inbox — filters, queue tabs, ticket detail panel | ✅ | feature | ✅ |
| 9 | gestão frota integration: `SendTicketToAegis` job + enum mapping | ✅ | feature | — |
| 10 | Roles + assignment: `role` on users, `assigned_to_user_id` on tickets, PATCH assign | ✅ | feature | ✅ |
| 11 | i18n: EN/PT-BR via react-i18next | ✅ | feature | ✅ |
| 12 | Settings: client (source) management UI with API key generation (admin only) | ✅ | feature | ✅ |
| 13 | ADRs: 001–006 | ✅ | docs | — |

---

## Phase 2 — Team Workflow ✅
> Goal: the team can fully manage tickets from inside Aegis.
> **Completed:** 2026-03-25

| # | Feature | Status | Type | i18n |
|---|---------|--------|------|------|
| 1 | User management UI: create/edit/activate agents and admins from Settings | ✅ | feature | ✅ |
| 2 | SLA engine: business-hours policies, holidays, pause/resume, admin override | ✅ | feature | ✅ |
| 3 | Manager dashboard: KPIs, overdue, unassigned, per-agent and per-client metrics | ✅ | feature | ✅ |
| 4 | Dashboard submenu: Visão Geral / Monitor de Equipe / Relatórios (placeholder) | ✅ | feature | ✅ |
| 5 | Webhook-out: push status changes back to source on team action | ✅ | feature | — |
| 6 | Webhook URL configurable per source in Settings | ✅ | feature | ✅ |
| 7 | Bidirectional conversation: team replies in Aegis visible in source | ✅ | feature | ✅ |
| 8 | Attachment support: upload/view docs and images on tickets | ✅ | feature | ✅ |
| 9 | Source soft-delete: inactivating a client hides all its tickets everywhere | ✅ | feature | ✅ |
| 10 | Inbox: "Em aberto" filter (active_only), text search, auto-refresh (30s) | ✅ | feature | ✅ |
| 11 | Inbox: smart sort — priority order, terminal statuses at the bottom | ✅ | feature | ✅ |
| 12 | Sidebar badge: live count of agent's active ticket queue | ✅ | feature | ✅ |
| 13 | Change-password flow on first login | ✅ | feature | ✅ |

---

## Phase 3 — Support Center Completeness ✅
> Goal: Aegis becomes a full-featured support center — on par with Zendesk/Freshdesk, tailored to this ecosystem.
> **Completed:** 2026-03-28

| # | Feature | Description | Status | i18n |
|---|---------|-------------|--------|------|
| 1 | Report an Issue | Internal option to generate a ticket from within Aegis | ✅ | ✅ |
| 2 | Auto-close | Automatically close tickets inactive beyond configurable threshold | ✅ | ✅ |
| 3 | Bulk operations | Bulk assign, bulk close, bulk change priority from inbox | ✅ | ✅ |
| 4 | Canned responses | Pre-written reply templates for common issues | ✅ | ✅ |
| 5 | Ticket tags | Free-form labels for classification and filtering | ✅ | ✅ |
| 6 | Internal notes on conversation | Notes visible only to team, interleaved in timeline — with @mention of agents | ✅ | ✅ |
| 6.1 | @mention notification center | Bell icon in header with unread badge; dropdown with "X mentioned you in #ID"; click navigates to ticket + marks as read; auto-mark on ticket open | ✅ | ✅ |
| 7 | Ticket merging | Merge duplicate tickets — messages consolidated, source becomes status=merged, irreversible | ✅ | ✅ |
| 8 | Escalation rules | Auto-escalate overdue or high-priority tickets to senior agent | ✅ | ✅ |
| 9 | Custom ticket view / saved filters | Save a filter set as a named view (e.g. "Urgent unassigned") | ✅ | ✅ |
| 10 | CSAT (satisfaction survey) | Short feedback request sent to client on ticket close — flag per source, sampling %, bidirectional webhook flow with gestão frota | ✅ | ✅ |
| 11 | Browser notifications for urgent tickets | OS-level balloon + tab badge + optional sound when a high/urgent ticket arrives — admins notified even when Aegis is not the active tab. Per-user preferences in Settings. See [ADR-007](adr/007_browser_notifications.md) | ✅ | ✅ |

---

## Phase 4 — Analytics & Reporting
> Goal: visibility into support patterns and team performance.

| # | Feature | Description | Priority | Status | i18n |
|---|---------|-------------|----------|--------|------|
| 1 | Analytics API | MTTR per source/type/priority, volume trends, SLA compliance over time | High | | |
| 2 | Reports dashboard | Charts (Recharts): ticket volume, resolution time, SLA rate, by-agent breakdown | High | | |
| 3 | Date range picker | Filter all dashboard metrics by configurable date range | High | | |
| 4 | CSV export | Export filtered ticket list or report summary to CSV | Medium | | |
| 5 | PDF report | Executive summary with charts (ReportLab / WeasyPrint) | Medium | | |
| 6 | CSAT analytics | Average rating per source/period, response rate, rating distribution histogram, worst-rated tickets list | High | | |
| 7 | Automatic insights *(ML)* | Detect anomalies in volume/type/SLA — surface "Type X up 40% this month at Client Y" without manual querying | Medium | | |
| 8 | SLA breach predictor *(ML)* | Flag tickets statistically likely to breach SLA before they do, based on ticket type, priority and historical resolution times — feeds a "at-risk" widget on the dashboard | Medium | | |

---

## Phase 5 — Ecosystem Integration
> Goal: connect Aegis to the rest of the internal ecosystem.

| # | Feature | Description | Priority | Status | i18n |
|---|---------|-------------|----------|--------|------|
| 1 | Maestro integration | Receive anomaly webhooks as automatic incident tickets | High | | |
| 2 | Orquestra integration | Governance decisions generate trackable Aegis tickets | Medium | | |
| 3 | Generic webhook-out | Configurable outbound webhooks per event type for any source | Medium | | |
| 4 | Historical import | Bulk ingest from existing gestão frota ticket history | High | | |
| 5 | Audit log API | Full immutable event trail queryable externally for compliance | Medium | | |
| 6 | Client portal | Self-service view for clients to track their own tickets (moved from Phase 3) | Low | | |

---

## Phase 6 — Communications (Email)
> Goal: proactive notifications and email-based interaction — depends on company mail server availability.

| # | Feature | Description | Priority | Status | i18n |
|---|---------|-------------|----------|--------|------|
| 1 | Email notifications: assignment | Notify agent when a ticket is assigned to them | High | | |
| 2 | Email notifications: new ticket | Notify team/admin when a high-priority ticket arrives | High | | |
| 3 | Email notifications: overdue SLA | Alert agent + manager when SLA deadline is breached | High | | |
| 4 | Email digest | Daily/weekly summary of open, overdue and resolved tickets for managers | Medium | | |
| 5 | Email notifications: @mention | Notify agent by email when @mentioned in an internal note — complements the in-app notification center (3.6.1) | Medium | | |
| 6 | Email-in | Receive client replies by email and thread them back into the ticket conversation | Low | | |

---

## Phase 7 — Intelligence (ML/AI)
> Goal: move from reactive rule-based workflows to proactive, data-driven assistance — without replacing explainable business logic where auditability matters.
>
> **Prerequisite:** Phase 4 analytics data must exist and be sufficiently rich (minimum ~6 months of production history) before training is viable.

| # | Feature | Description | Priority | Status | i18n |
|---|---------|-------------|----------|--------|------|
| 1 | Auto-priority suggestion | On ticket ingest, suggest priority based on subject/description text and historical patterns for that source — agent can accept or override | High | | |
| 2 | Auto-categorization (type) | Classify ticket `type` (bug / improvement / question / support) automatically from free text using a fine-tuned classifier — reduces manual triaging | High | | |
| 3 | Proactive SLA escalation | Extend the rule-based escalation engine (3.8) with an ML signal: escalate tickets predicted to breach even when no deterministic rule has triggered yet | Medium | | |
| 4 | CSAT score predictor | Predict expected satisfaction rating before the survey is sent, based on resolution time, number of replies, agent, and ticket type — surfaces likely-unhappy clients for proactive follow-up | Medium | | |
| 5 | Agent workload balancer | Suggest optimal assignee for incoming tickets based on current queue depth, historical resolution speed per type, and agent availability | Medium | | |
| 6 | Sentiment analysis on replies | Detect frustration or urgency in client messages and visually flag the ticket — complements CSAT by catching dissatisfied clients before ticket close | Low | | |
| 7 | Duplicate detection | Automatically suggest merging new tickets that are semantically similar to existing open ones — extends the manual merge feature (3.7) | Low | | |
