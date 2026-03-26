from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy.exc import IntegrityError

from app.core.auth import AdminUser, CurrentUser
from app.core.dependencies import DbSession
from app.schemas.auth import UserCreateRequest, UserResponse, UserUpdateRequest
from app.services.user_service import UserService

router = APIRouter(prefix="/v1/users", tags=["users"])


@router.get("", response_model=list[UserResponse])
async def list_users(db: DbSession, current_user: CurrentUser) -> list[UserResponse]:
    """Admins get all users. Others get active agents/admins (for assignment dropdowns)."""
    if current_user.role == "admin":
        users = await UserService(db).list_all()
    else:
        users = await UserService(db).list_agents()
    return [UserResponse.model_validate(u) for u in users]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=UserResponse)
async def create_user(
    data: UserCreateRequest, db: DbSession, _: AdminUser
) -> UserResponse:
    try:
        user = await UserService(db).create(
            email=data.email,
            password=data.password,
            name=data.name,
            role=data.role,
            must_change_password=True,
        )
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A user with email '{data.email}' already exists",
        )
    return UserResponse.model_validate(user)


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int, data: UserUpdateRequest, db: DbSession, _: AdminUser
) -> UserResponse:
    try:
        user = await UserService(db).update(
            user_id,
            name=data.name,
            email=str(data.email) if data.email else None,
            password=data.password,
            role=data.role,
            is_active=data.is_active,
        )
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with that email already exists",
        )
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserResponse.model_validate(user)
