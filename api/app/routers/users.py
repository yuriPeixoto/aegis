from __future__ import annotations

from fastapi import APIRouter

from app.core.auth import CurrentUser
from app.core.dependencies import DbSession
from app.schemas.auth import UserResponse
from app.services.user_service import UserService

router = APIRouter(prefix="/v1/users", tags=["users"])


@router.get("", response_model=list[UserResponse])
async def list_users(db: DbSession, _current_user: CurrentUser) -> list[UserResponse]:
    """List all active agents and admins — used to populate assignment dropdowns."""
    users = await UserService(db).list_agents()
    return [UserResponse.model_validate(u) for u in users]
