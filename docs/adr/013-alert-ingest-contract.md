# ADR-013: Alert ingest contract — one ticket per problem

**Status:** Accepted
**Date:** 2026-11-27

## Context

Aegis receives tickets from two kinds of senders:

- **Support modules** that own their tickets (the fleet management system of each client). Aegis mirrors
  them through `POST /v1/ingest/tickets`, keyed by `(source_id, external_id)`; every delivery overwrites
  status, subject and description, because the source is the system of record for those fields.
- **Monitoring tools** (a log watcher, a cron watcher, and soon a metrics/alerting platform) that report
  *problems*. They have no ticket of their own. Using the mirroring contract for them goes wrong in
  different ways: a tool that sends a new `external_id` per failure opens one ticket per failure; one that
  sends a stable signature has the ticket's text overwritten on every repetition, with no count of how
  often it happened. Neither gets a retry-safe delivery, and their urgent tickets sat in `open` with no SLA
  clock, because the clock started only on `in_progress`.

The critical-source alert (tag + blocking notification) was a hardcoded `slug → (tag, e-mail)` map,
with the e-mail moved to an environment variable when the repository went public.

The incoming alerting platform needs a contract to implement against: open a ticket per problem, never
duplicate it while it is open.

## Decision

1. **`sources.kind`** — `system` (default) or `alert`. Alert sources carry their own settings:
   `alert_tag_id`, `alert_recipient_user_id` (a user, not an e-mail), and every source may set
   `rate_limit_per_minute`. The hardcoded map and `AEGIS_CRITICAL_ALERT_EMAIL` are removed, without a
   fallback; migration 045 turns the `log-watcher` source into an alert source with its tag, and the
   recipient is configured per installation (Settings or SQL), so no installation data is versioned.
2. **A separate endpoint, `POST /v1/ingest/alerts`**, versioned (`contract_version: 1`), only for alert
   sources. The mirroring endpoint is untouched, so existing senders need no change.
3. **`fingerprint` identifies the problem; `event_id` identifies the delivery.**
   - `alert_events` has a unique `(source_id, event_id)`: the same event is applied once, and a retry gets
     the first outcome back (`duplicate`). Senders get at-least-once delivery for free.
   - While a ticket of the fingerprint is open (not `resolved`/`closed`/`cancelled`/`merged`), a new
     `firing` event is an **occurrence**: `occurrence_count + 1`, `last_occurrence_at`, a timeline event.
     The text, priority and status written by people are never overwritten, and no one is notified again.
   - A partial unique index on `tickets (source_id, alert_fingerprint) WHERE <open>` makes "one open ticket
     per problem" a database guarantee; two concurrent first events race, one loses the insert and is
     retried as an occurrence. The open ticket is locked (`SELECT … FOR UPDATE`) while an occurrence is
     counted.
4. **A closed problem that fires again opens a new ticket**, linked by `previous_ticket_id`, and the
   closed ticket gets an `alert_recurred` event. Reopening was rejected: it would erase the resolution
   (`resolved_at`, SLA result, the record of who closed it and when) and mix two incidents in one timeline.
5. **`status: resolved` never closes a ticket** — it is noted on the timeline. Closing stays a human
   decision.
6. **The SLA of an alert source starts at creation**, from the priority's policy in business hours, on
   both endpoints.
7. **Per-source rate limit in Postgres**: fixed one-minute windows in `source_rate_windows`, one
   `INSERT … ON CONFLICT DO UPDATE … RETURNING` per request, 429 with `Retry-After`. No Redis: Postgres is
   the only infrastructure dependency, and the ingest volume (a few requests per second at peak) does not
   justify another one.
8. **`/health` touches the database** (`SELECT 1`, 2 s timeout) and answers 503 when it fails, with a body
   that says only `ok`/`down` per dependency — the shape the external watchdog already reads.

## Consequences

- An alert ticket's `external_id` is the `event_id` of the event that opened it, so it never collides when
  the same problem recurs.
- `alert_events` grows by one row per event. It is small, but nothing prunes it yet; retention belongs to
  the background worker planned next.
- The rate-limit dependency adds one write per ingest request (and commits it before the handler runs).
- A ticket manually moved back from `resolved` to `open` while a newer ticket of the same problem is open
  violates the partial unique index; the status change fails instead of creating two open tickets of one
  problem.
- Existing open alert tickets keep their missing SLA: starting it retroactively would make them all
  overdue at once and fire escalations.
- Contract: [`docs/alert-ingest.md`](../alert-ingest.md).
