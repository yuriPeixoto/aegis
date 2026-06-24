# Changelog

All notable changes to this project will be documented in this file.

## [1.0.1] — 2026-06-24

### Fixed
- **Attachment download from GF** — axios `baseURL` `/v1` was double-prefixing `download_url` to `/v1/v1/attachments/…`, causing 404 on all attachment downloads from ingested tickets

## [1.0.0] — 2026-06-24

### Added
- **Unified inbox** with filters, smart sort, and 30s auto-refresh
- **Bidirectional conversation** — client replies in source system, team replies in Aegis
- **Attachment support** — images, documents, and video
- **Internal notes** with @mention of agents and in-app notification center
- **Browser notifications** for high/urgent tickets (OS-level, with per-user preferences)
- **SLA tracking** — business-hours policies, holidays, pause/resume, admin override
- **Escalation rules** — automatic escalation based on SLA and configurable conditions
- **Manager dashboard** — KPIs, queue metrics, overdue tickets, unassigned items
- **Agent profile page** — per-agent KPIs, volume trend, workload charts, ticket history
- **Reports dashboard** — charts by volume, resolution time, SLA rate, agent, and client
- **Analytics API** — MTTR, SLA compliance over time, date-range filtering, ML extension points
- **Canned responses** — reusable reply templates for common issues
- **Ticket tags** and saved views (named filter sets)
- **Bulk operations** — assign, close, or change priority from inbox
- **Auto-close** — configurable inactivity threshold
- **Ticket merging** for duplicate consolidation
- **CSAT** — satisfaction survey on ticket close with bidirectional webhook flow
- **Team calendar** — on-call schedule and client training sessions (Phase 4.5)
- **User management** — create/edit/activate agents and admins (admin only)
- **Source management** — register clients, generate API keys, configure webhooks
- **Webhook ingestion** — external systems push tickets via REST API + API key
- **Webhook-out** — push status changes and team replies back to source
- **gestão frota integration** — `SendTicketToAegis` job with enum mapping
- **i18n** — EN / PT-BR via react-i18next
- **View /sobre** — build info (version, date, environment) and quick links
- **CI** — ruff + mypy + pytest on every push (GitHub Actions)
