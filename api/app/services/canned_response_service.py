from __future__ import annotations

import re
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.canned_response import CannedResponse
from app.models.ticket import Ticket
from app.models.user import User
from app.schemas.canned_response import CannedResponseCreate, CannedResponseUpdate


class CannedResponseService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def list_responses(self) -> list[CannedResponse]:
        result = await self._db.execute(
            select(CannedResponse).order_by(CannedResponse.title.asc())
        )
        return list(result.scalars().all())

    async def get_response(self, response_id: int) -> CannedResponse | None:
        result = await self._db.execute(
            select(CannedResponse).where(CannedResponse.id == response_id)
        )
        return result.scalar_one_or_none()

    async def create_response(
        self, body: CannedResponseCreate, user_id: int
    ) -> CannedResponse:
        actions_dict = body.actions.model_dump() if body.actions else None
        response = CannedResponse(
            title=body.title,
            body=body.body,
            actions=actions_dict,
            created_by_id=user_id,
        )
        self._db.add(response)
        await self._db.commit()
        await self._db.refresh(response)
        return response

    async def update_response(
        self, response_id: int, body: CannedResponseUpdate
    ) -> CannedResponse | None:
        response = await self.get_response(response_id)
        if not response:
            return None

        if body.title is not None:
            response.title = body.title
        if body.body is not None:
            response.body = body.body
        if body.actions is not None:
            response.actions = body.actions.model_dump()

        await self._db.commit()
        await self._db.refresh(response)
        return response

    async def delete_response(self, response_id: int) -> bool:
        response = await self.get_response(response_id)
        if not response:
            return False
        await self._db.execute(delete(CannedResponse).where(CannedResponse.id == response_id))
        await self._db.commit()
        return True

    def substitute_variables(self, text: str, ticket: Ticket, user: User) -> str:
        """
        Replaces variables in the text with ticket and user data.
        Supported variables:
        {{ticket.id}}, {{ticket.external_id}}, {{ticket.subject}}, {{ticket.requester.name}} (if available in metadata)
        {{user.name}} (current agent)
        """
        vars_map = {
            "ticket.id": str(ticket.id),
            "ticket.external_id": ticket.external_id,
            "ticket.subject": ticket.subject,
            "user.name": user.name,
        }
        
        # Try to extract requester name from source_metadata if present
        requester_name = ""
        if ticket.source_metadata:
            # Common patterns in metadata
            requester_name = (
                ticket.source_metadata.get("user_name") or 
                ticket.source_metadata.get("requester_name") or 
                ticket.source_metadata.get("client_name") or
                ticket.source_metadata.get("requester", {}).get("name") or
                ""
            )
        
        vars_map["ticket.requester.name"] = str(requester_name)

        def replace(match):
            var_name = match.group(1).strip()
            # If the variable name is not in the map, we keep the original text {{var}}
            # BUT if it is a known variable like ticket.requester.name and it's empty, we use empty string
            if var_name in vars_map:
                return vars_map[var_name]
            return match.group(0)

        return re.sub(r"\{\{(.*?)\}\}", replace, text)
