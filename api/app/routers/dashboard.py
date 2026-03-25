from __future__ import annotations

from fastapi import APIRouter

from app.core.auth import AdminUser
from app.core.dependencies import DbSession
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix='/v1/dashboard', tags=['dashboard'])


@router.get('/stats')
async def get_dashboard_stats(db: DbSession, _admin: AdminUser) -> dict:
    return await DashboardService(db).get_stats()


@router.get('/agent-monitor')
async def get_agent_monitor(db: DbSession, _admin: AdminUser) -> dict:
    return await DashboardService(db).get_agent_monitor()
