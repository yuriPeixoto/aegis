from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.core.auth import CurrentUser
from app.core.dependencies import DbSession
from app.core.security import create_access_token
from app.schemas.auth import LoginRequest, TokenResponse, UserResponse
from app.services.user_service import UserService

router = APIRouter(prefix="/v1/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: DbSession) -> TokenResponse:
    user = await UserService(db).authenticate(data.email, data.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    return TokenResponse(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserResponse)
async def me(current_user: CurrentUser) -> UserResponse:
    return UserResponse.model_validate(current_user)
