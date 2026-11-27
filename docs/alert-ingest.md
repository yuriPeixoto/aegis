# Alert ingest contract — v1

How a monitoring tool sends alerts to Aegis so that each **problem** becomes **one ticket** while it is
open, however many times it fires. Decision record: [ADR-013](adr/013-alert-ingest-contract.md).

The ticket-mirroring contract (`POST /v1/ingest/tickets`, used by support modules that own their tickets)
is unchanged and still accepted, including from alert sources.

## Source setup

An admin registers the tool in **Settings → Integrations** with type **Alert** (`kind = "alert"`), and
optionally:

| Setting | Effect |
|---------|--------|
| Tag | Applied to every ticket the source opens |
| Critical alert recipient | Gets the blocking "critical source" notification when a ticket is opened |
| Rate limit | Requests per minute for this source (empty = server default, `AEGIS_INGEST_RATE_LIMIT_PER_MINUTE`, 600) |

Tickets of an alert source start their SLA clock **at creation**, from the SLA policy of their priority
(business hours). Tickets of a `system` source keep starting it when an agent moves them to `in_progress`.

## Request

```
POST /v1/ingest/alerts
X-Aegis-Key: <source api key>
Content-Type: application/json
```

```json
{
  "contract_version": 1,
  "event_id": "9b2f6c1e-3d0a-4c51-9a77-1f0e2b7c4d10",
  "fingerprint": "server-a:disk-full:/var",
  "status": "firing",
  "priority": "urgent",
  "type": "bug",
  "subject": "Disk /var at 97% on server-a",
  "description": "Free space below 3% for 10 minutes.",
  "occurred_at": "2026-12-04T14:05:00Z",
  "metadata": { "server": "server-a", "rule": "disk-full", "value": 97.2 }
}
```

| Field | Type | Required | Meaning |
|-------|------|----------|---------|
| `contract_version` | `1` | no (default `1`) | Any other value is rejected (422) |
| `event_id` | string, 1–100 | **yes** | Unique per event **within the source**. Retrying the same event must reuse it. Becomes the `external_id` of the ticket it opens |
| `fingerprint` | string, 1–200 | **yes** | Identifies the problem. Same fingerprint = same problem. Keep it stable across events and free of values that change every time (timestamps, counters) |
| `status` | `firing` \| `resolved` | no (default `firing`) | `resolved` tells Aegis the problem stopped |
| `priority` | `low` \| `medium` \| `high` \| `urgent` | no (default `medium`) | Priority of a new ticket; drives its SLA |
| `type` | string, ≤ 50 | no (default `bug`) | Ticket type of a new ticket |
| `subject` | string, 1–500 | **yes** | Title of a new ticket |
| `description` | string | no | Body of a new ticket (Markdown) |
| `occurred_at` | ISO 8601 datetime | no (default: reception time) | When the event happened at the source |
| `metadata` | object | no | Opaque; stored on a new ticket and in each timeline event |

## What Aegis does

A ticket is **open** while its status is not `resolved`, `closed`, `cancelled` or `merged`
(`pending_closure` counts as open: the problem came back before the fix was confirmed).

| Situation | Effect | `result` | HTTP |
|-----------|--------|----------|------|
| `event_id` already processed for this source | Nothing; returns the ticket of the first delivery | `duplicate` | 200 |
| `firing`, no open ticket for the fingerprint | New ticket (status `open`), tag, notifications, SLA started | `created` | 201 |
| `firing`, the fingerprint's last ticket is closed | New ticket as above, with `previous_ticket_id` pointing to the closed one; an `alert_recurred` event is added to the closed ticket. The closed ticket is never reopened | `created` | 201 |
| `firing`, open ticket exists | `occurrence_count` + 1, `last_occurrence_at` set, `alert_occurrence` event on the timeline. Subject, description, priority and status are **not** changed; no notification | `occurrence` | 200 |
| `resolved`, open ticket exists | `alert_resolved` event on the timeline. The ticket is **not** closed: a person closes it | `resolved_noted` | 200 |
| `resolved`, no open ticket | Nothing | `ignored` | 200 |

If the fingerprint's last ticket was merged into another ticket that is still open, the occurrence is
counted on that ticket.

## Response

```json
{
  "contract_version": 1,
  "result": "occurrence",
  "ticket_id": 1931,
  "external_id": "9b2f6c1e-3d0a-4c51-9a77-1f0e2b7c4d10",
  "occurrence_count": 3,
  "previous_ticket_id": null
}
```

`ticket_id`, `external_id` and `occurrence_count` are `null` when `result` is `ignored`.
`previous_ticket_id` is set only when `result` is `created` and the problem had a closed ticket before.

## Errors

| HTTP | When | What to do |
|------|------|------------|
| 401 | Missing, invalid or inactive `X-Aegis-Key` | Fix the key |
| 403 | The source is not of kind `alert` | Change the source type in Settings |
| 409 | The `event_id` is already the `external_id` of another ticket of the source (sent through `/v1/ingest/tickets`) | Use another `event_id` |
| 422 | Invalid payload (missing field, unknown `priority` or `status`, `contract_version` ≠ 1) | Fix the payload; do not retry as is |
| 429 | Rate limit of the source exceeded | Retry after the `Retry-After` header (seconds), with the same `event_id` |
| 5xx | Aegis or its database unavailable | Retry with backoff, with the same `event_id` |

Because `event_id` makes delivery idempotent, the sender can safely retry anything that did not get a 2xx
(at-least-once delivery).

## Rate limit

Every `/v1/ingest/*` request counts against its source in fixed one-minute windows (UTC minute
boundaries). Above the limit the answer is `429` with `Retry-After`. The counter lives in Postgres.

## Health

`GET /health` needs no authentication and checks the database (`SELECT 1`, 2 s timeout):

| HTTP | Body |
|------|------|
| 200 | `{"status": "healthy", "dependencies": {"database": "ok"}}` |
| 503 | `{"status": "unhealthy", "dependencies": {"database": "down"}}` |

## Versioning

The contract is versioned by `contract_version` and by the path. Additive changes (new optional fields,
new `result` values) keep version 1; senders must ignore unknown response fields. A breaking change gets
`contract_version: 2`, and version 1 stays accepted until every known sender has moved.
