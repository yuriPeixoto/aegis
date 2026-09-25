"""Status translations between Aegis's internal vocabulary and what a source
system (GF today) understands, shared by every code path that reports a
ticket's status outward — the webhook push (ticket_sync_hooks.py) and the
drift-reconciliation snapshot (routers/ingest.py) alike. See Aegis #1437/#1447:
having this live in only one of those paths is exactly how #1447 happened.
"""

from __future__ import annotations

# Aegis statuses with no equivalent in the GF status vocabulary
# (AegisWebhookController::handleStatusChanged only maps in_progress/
# pending_closure/resolved/closed/cancelled). A merged ticket is, from the
# client's point of view in the source system, wrapped up — report it as
# closed rather than leaving the source ticket stuck forever. See Aegis #1437.
STATUS_OVERRIDES_FOR_SOURCE: dict[str, str] = {
    "merged": "closed",
}


def status_for_source(status: str) -> str:
    return STATUS_OVERRIDES_FOR_SOURCE.get(status, status)
