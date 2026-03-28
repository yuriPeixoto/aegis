from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.core.auth import CurrentUser
from app.core.dependencies import DbSession
from app.schemas.saved_view import SavedViewCreate, SavedViewResponse, SavedViewUpdate
from app.services.saved_view_service import SavedViewService

router = APIRouter(prefix="/v1/views", tags=["views"])


@router.get("", response_model=list[SavedViewResponse])
async def list_views(db: DbSession, current_user: CurrentUser) -> list[SavedViewResponse]:
    views = await SavedViewService(db).list_for_user(current_user.id)
    return [SavedViewResponse.model_validate(v) for v in views]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=SavedViewResponse)
async def create_view(
    data: SavedViewCreate, db: DbSession, current_user: CurrentUser
) -> SavedViewResponse:
    # Only admins may create shared views
    if data.is_shared and current_user.role != "admin":
        data = data.model_copy(update={"is_shared": False})
    view = await SavedViewService(db).create(current_user.id, data)
    return SavedViewResponse.model_validate(view)


@router.patch("/{view_id}", response_model=SavedViewResponse)
async def update_view(
    view_id: int, data: SavedViewUpdate, db: DbSession, current_user: CurrentUser
) -> SavedViewResponse:
    view = await SavedViewService(db).update(
        view_id, current_user.id, current_user.role == "admin", data
    )
    if view is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="View not found or insufficient permissions",
        )
    return SavedViewResponse.model_validate(view)


@router.delete("/{view_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_view(
    view_id: int, db: DbSession, current_user: CurrentUser
) -> None:
    deleted = await SavedViewService(db).delete(
        view_id, current_user.id, current_user.role == "admin"
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="View not found or insufficient permissions",
        )
