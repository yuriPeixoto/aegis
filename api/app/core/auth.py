from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader, OAuth2PasswordBearer

from app.core.dependencies import DbSession
from app.core.security import decode_access_token
from app.models.source import Source
from app.models.user import User
from app.services.source_service import SourceService
from app.services.user_service import UserService

# ── Source (ingest) auth ──────────────────────────────────────────────────────

_api_key_header = APIKeyHeader(name="X-Aegis-Key", auto_error=False)


async def get_current_source(
    db: DbSession,
    api_key: Annotated[str | None, Security(_api_key_header)] = None,
) -> Source:
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-Aegis-Key header is required",
        )
    source = await SourceService(db).get_by_api_key(api_key)
    if source is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or inactive API key",
        )
    return source


CurrentSource = Annotated[Source, Depends(get_current_source)]

# ── Dashboard (user) auth ─────────────────────────────────────────────────────

_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/v1/auth/login", auto_error=False)


async def get_current_user(
    db: DbSession,
    token: Annotated[str | None, Depends(_oauth2_scheme)] = None,
) -> User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = decode_access_token(token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = await UserService(db).get_by_id(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


async def require_admin(current_user: CurrentUser) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required",
        )
    return current_user


AdminUser = Annotated[User, Depends(require_admin)]
