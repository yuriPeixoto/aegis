# Aegis — Vision

## The Problem

A development team manages the same software product deployed at multiple client sites.
Each client instance has its own support ticket system. The team must log into 3, 4, 5
different systems to check open tickets — losing context, missing urgencies, wasting time.

There is no central view. There is no SLA tracking across clients. There is no way to
see "what is the team's actual workload right now?"

## What Aegis Is

A **centralized ticket and incident inbox** for teams operating across multiple systems.

Source systems push tickets to Aegis via a simple webhook API. The team works from a
single dashboard — filtering, commenting, tracking SLA, managing status — without ever
logging into the source systems for support work.

## What Aegis Is Not

- **Not a replacement for source ticket systems** — it mirrors and aggregates, it doesn't replace
- **Not a project management tool** — that's Orquestra
- **Not an observability tool** — that's Maestro
- **Not a customer-facing portal** — it's an internal operations tool

## Design Principles

1. **Source-agnostic ingestion** — any system can push tickets via HTTP + API key
2. **Non-destructive mirroring** — source data is preserved; Aegis adds its own layer on top
3. **Team-first UX** — optimized for the support team's workflow, not the ticket reporter's
4. **Webhook-out** — status changes in Aegis can optionally push back to source systems (Phase 4)
5. **Data ownership** — all data stays on your infrastructure

## Ecosystem Position

```
gestão frota (Cliente A)  ──┐
gestão frota (Cliente B)  ──┤  POST /v1/ingest/tickets
gestão frota (Cliente C)  ──┤──────────────────────────▶  Aegis
Maestro (anomaly alert)   ──┘                              │
                                                    unified dashboard
                                                    SLA tracking
                                                    analytics & reports
```

In the broader ecosystem:
- **Maestro** → Aegis: infrastructure anomalies become support incidents automatically
- **Orquestra** → Aegis: governance decisions that require action become trackable tickets (Phase 4)
