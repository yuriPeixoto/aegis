from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.core.auth import AdminUser
from app.core.dependencies import DbSession
from app.schemas.escalation import (
    EscalationRuleCreate,
    EscalationRuleResponse,
    EscalationRuleUpdate,
    EscalationRunResult,
    VALID_ACTION_TYPES,
    VALID_TRIGGER_TYPES,
)
from app.services.escalation_service import EscalationService

router = APIRouter(prefix="/v1/escalation", tags=["escalation"])


def _rule_response(rule) -> EscalationRuleResponse:
    return EscalationRuleResponse(
        id=rule.id,
        name=rule.name,
        is_active=rule.is_active,
        trigger_type=rule.trigger_type,
        trigger_hours=rule.trigger_hours,
        condition_priority=rule.condition_priority or [],
        condition_status=rule.condition_status or [],
        action_type=rule.action_type,
        action_user_id=rule.action_user_id,
        action_user_name=rule.action_user.name if rule.action_user else None,
        action_tag_id=rule.action_tag_id,
        cooldown_hours=rule.cooldown_hours,
        created_at=rule.created_at,
    )


@router.get("/rules", response_model=list[EscalationRuleResponse])
async def list_rules(db: DbSession, _: AdminUser) -> list[EscalationRuleResponse]:
    rules = await EscalationService(db).list_rules()
    return [_rule_response(r) for r in rules]


@router.post("/rules", status_code=status.HTTP_201_CREATED, response_model=EscalationRuleResponse)
async def create_rule(
    data: EscalationRuleCreate, db: DbSession, _: AdminUser
) -> EscalationRuleResponse:
    if data.trigger_type not in VALID_TRIGGER_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid trigger_type. Must be one of: {sorted(VALID_TRIGGER_TYPES)}",
        )
    if data.action_type not in VALID_ACTION_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid action_type. Must be one of: {sorted(VALID_ACTION_TYPES)}",
        )
    rule = await EscalationService(db).create_rule(data)
    return _rule_response(rule)


@router.patch("/rules/{rule_id}", response_model=EscalationRuleResponse)
async def update_rule(
    rule_id: int, data: EscalationRuleUpdate, db: DbSession, _: AdminUser
) -> EscalationRuleResponse:
    rule = await EscalationService(db).update_rule(rule_id, data)
    if rule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
    return _rule_response(rule)


@router.delete("/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rule(rule_id: int, db: DbSession, _: AdminUser) -> None:
    deleted = await EscalationService(db).delete_rule(rule_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")


@router.post("/run", response_model=EscalationRunResult)
async def run_escalation(db: DbSession, _: AdminUser) -> EscalationRunResult:
    """Trigger escalation rule evaluation. Called by OS cron or manually by admin."""
    result = await EscalationService(db).run()
    return EscalationRunResult(**result)
