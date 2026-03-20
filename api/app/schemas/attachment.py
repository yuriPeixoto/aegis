from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, computed_field


class AttachmentResponse(BaseModel):
    id: int
    ticket_id: int
    original_filename: str
    content_type: str
    size_bytes: int
    created_at: datetime

    @computed_field  # type: ignore[prop-decorator]
    @property
    def download_url(self) -> str:
        return f"/v1/attachments/{self.id}/download"

    model_config = {"from_attributes": True}
