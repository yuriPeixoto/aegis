from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


VALID_TRIGGER_TYPES = {"sla_at_risk", "sla_breach", "no_update", "unassigned_time"}
VALID_ACTION_TYPES = {
    "reassign_to_user",
    "notify_admins",
    "increase_priority",
    "add_tag",
    "notify_senior_agents",
}


class EscalationRuleCreate(BaseModel):
    name: str
    is_active: bool = True
    trigger_type: str
    trigger_hours: float
    condition_priority: list[str] = []
    condition_status: list[str] = []
    action_type: str
    action_user_id: int | None = None
    action_tag_id: int | None = None
    cooldown_hours: float = 24.0


class EscalationRuleUpdate(BaseModel):
    name: str | None = None
    is_active: bool | None = None
    trigger_type: str | None = None
    trigger_hours: float | None = None
    condition_priority: list[str] | None = None
    condition_status: list[str] | None = None
    action_type: str | None = None
    action_user_id: int | None = None
    action_tag_id: int | None = None
    cooldown_hours: float | None = None


class EscalationRuleResponse(BaseModel):
    id: int
    name: str
    is_active: bool
    trigger_type: str
    trigger_hours: float
    condition_priority: list[str]
    condition_status: list[str]
    action_type: str
    action_user_id: int | None
    action_user_name: str | None
    action_tag_id: int | None
    cooldown_hours: float
    created_at: datetime

    model_config = {"from_attributes": True}


class EscalationRunResult(BaseModel):
    rules_evaluated: int
    tickets_escalated: int
    actions_taken: list[str]
