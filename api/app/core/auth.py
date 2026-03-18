from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader

from app.core.dependencies import DbSession
from app.models.source import Source
from app.services.source_service import SourceService

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
