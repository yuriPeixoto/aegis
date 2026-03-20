from __future__ import annotations

import hashlib
import hmac
import json
import logging

import httpx

logger = logging.getLogger(__name__)


async def dispatch_webhook(
    webhook_url: str,
    webhook_secret: str | None,
    event_type: str,
    payload: dict,
) -> None:
    """Fire-and-forget: send a signed webhook to a source system.

    Called as a BackgroundTask — failures are logged but do not affect
    the API response that triggered the action.
    """
    body = json.dumps({"event": event_type, **payload}, default=str)

    headers: dict[str, str] = {"Content-Type": "application/json"}
    if webhook_secret:
        sig = hmac.new(webhook_secret.encode(), body.encode(), hashlib.sha256).hexdigest()
        headers["X-Aegis-Signature"] = f"sha256={sig}"

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(webhook_url, content=body, headers=headers)
            if response.is_error:
                logger.warning(
                    "webhook: non-2xx from %s — %s %s",
                    webhook_url,
                    response.status_code,
                    response.text[:200],
                )
            else:
                logger.info("webhook: delivered %s to %s", event_type, webhook_url)
    except Exception as exc:
        logger.error("webhook: failed to deliver %s to %s — %s", event_type, webhook_url, exc)
