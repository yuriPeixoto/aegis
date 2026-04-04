from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.core.auth import CurrentUser
from app.core.config import settings
from app.core.dependencies import DbSession
from app.core.security import create_access_token
from app.schemas.auth import LoginRequest, TokenResponse, UserResponse
from app.services.user_service import UserService

_AVATAR_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
_AVATAR_MAX_BYTES = 5 * 1024 * 1024  # 5 MB

router = APIRouter(prefix="/v1/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: DbSession) -> TokenResponse:
    user = await UserService(db).authenticate(data.email, data.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    return TokenResponse(
        access_token=create_access_token(user.id),
        must_change_password=user.must_change_password,
    )


@router.get("/me", response_model=UserResponse)
async def me(current_user: CurrentUser) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_my_profile(
    db: DbSession,
    current_user: CurrentUser,
    name: str | None = Form(None),
    email: str | None = Form(None),
    avatar: UploadFile | None = File(None),
) -> UserResponse:
    avatar_filename: str | None = None

    if avatar is not None and avatar.filename:
        content_type = avatar.content_type or ""
        if content_type not in _AVATAR_ALLOWED_TYPES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Avatar must be JPEG, PNG, or WebP",
            )
        content = await avatar.read()
        if len(content) > _AVATAR_MAX_BYTES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Avatar file too large (max 5 MB)",
            )
        suffix = Path(avatar.filename).suffix.lower() or ".jpg"
        avatar_filename = f"{uuid.uuid4().hex}{suffix}"
        avatar_dir = Path(settings.upload_dir) / "avatars"
        avatar_dir.mkdir(parents=True, exist_ok=True)
        (avatar_dir / avatar_filename).write_bytes(content)

    user = await UserService(db).update_profile(
        current_user.id,
        name=name,
        email=email,
        avatar_filename=avatar_filename,
    )
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserResponse.model_validate(user)


class ChangePasswordRequest(BaseModel):
    new_password: str


@router.post("/change-password", response_model=UserResponse)
async def change_password(
    data: ChangePasswordRequest, db: DbSession, current_user: CurrentUser
) -> UserResponse:
    if len(data.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 8 characters",
        )
    user = await UserService(db).change_password(current_user.id, data.new_password)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserResponse.model_validate(user)
