from typing import List
from fastapi import APIRouter, Depends, Path
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.db.session import get_db
from core.exceptions import NotFoundError
from core.models.users import User, UserRole
from core.models.credibility_log import CredibilityLog
from core.schemas.credibility import (
    LowCredibilityUserResponse,
    CredibilityHistoryResponse,
    CredibilityLogResponse
)
from core.security import require_roles
from core.services.credibility_service import CredibilityService

router = APIRouter(tags=["Credibility Score Oversight"])


@router.get("/users/low-credibility", response_model=List[LowCredibilityUserResponse])
async def get_low_credibility_users(
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """
    List all citizens whose credibility score has dropped below the 0.5 alert threshold.
    """
    items = await CredibilityService.get_low_credibility_users(db)
    return [LowCredibilityUserResponse(**item) for item in items]


@router.get("/users/{user_id}/credibility", response_model=CredibilityHistoryResponse)
async def get_user_credibility_history(
    user_id: int = Path(...),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """
    Audit log of credibility changes and penalties for a specific citizen.
    """
    user_res = await db.execute(select(User).where(User.id == user_id))
    user = user_res.scalar_one_or_none()
    if not user:
        raise NotFoundError(f"User {user_id} not found")

    logs_res = await db.execute(
        select(CredibilityLog)
        .where(CredibilityLog.user_id == user_id)
        .order_by(CredibilityLog.created_at.desc())
    )
    logs = logs_res.scalars().all()

    return CredibilityHistoryResponse(
        user_id=user.id,
        current_score=user.credibility_score,
        status=user.status.value,
        logs=[CredibilityLogResponse.model_validate(log) for log in logs]
    )
