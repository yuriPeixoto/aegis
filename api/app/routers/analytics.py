from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.core.auth import AdminUser, CurrentUser
from app.core.dependencies import DbSession
from app.services.analytics_service import AnalyticsService, Granularity

router = APIRouter(prefix='/v1/analytics', tags=['analytics'])

# ── Agent profile analytics ──────────────────────────────────────────────────
#
# Access rules:
#   - Admins: any agent_id
#   - Agents/viewers: only their own user_id
#
# This endpoint is the data source for the Agent Profile Page (4.3).
# Future ML consumers (Phase 7.4 CSAT predictor, 7.5 workload balancer)
# will call the same endpoint or extend AnalyticsService directly.


@router.get('/agent/{user_id}')
async def get_agent_analytics(
    user_id: int,
    db: DbSession,
    current_user: CurrentUser,
    from_date: Annotated[date | None, Query(alias='from')] = None,
    to_date: Annotated[date | None, Query(alias='to')] = None,
    granularity: Annotated[Granularity, Query()] = 'day',
) -> dict:
    if current_user.role != 'admin' and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='You can only view your own analytics',
        )
    data = await AnalyticsService(db).get_agent_stats(user_id, from_date, to_date, granularity)
    if data is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='User not found')
    return data


# ── Overview analytics ───────────────────────────────────────────────────────
#
# Admin-only. Powers the Reports dashboard tab (4.4).
#
# Extension point: Phase 4.7 (automatic insights) will POST to
# /v1/analytics/insights/run (or inject into this response via an
# InsightsService called here) — no changes to this endpoint signature needed.


@router.get('/overview')
async def get_overview_analytics(
    db: DbSession,
    _admin: AdminUser,
    from_date: Annotated[date | None, Query(alias='from')] = None,
    to_date: Annotated[date | None, Query(alias='to')] = None,
    granularity: Annotated[Granularity, Query()] = 'day',
) -> dict:
    return await AnalyticsService(db).get_overview(from_date, to_date, granularity)
