from typing import List
from fastapi import APIRouter, Depends, Path, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.db.session import get_db
from core.models.users import User, UserRole
from core.schemas.block import (
    BlockUserRequest,
    BlockHistoryResponse,
    BlockSuggestionResponse
)
from core.security import require_roles
from core.services.block_service import BlockService

router = APIRouter(tags=["User Blocking & Enforcement"])


@router.get("/users/{user_id}/block-suggest", response_model=BlockSuggestionResponse)
async def get_block_suggestion(
    user_id: int = Path(...),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """
    Auto-suggests the next escalation duration tier based on prior block history:
    1st block -> 3d
    2nd block -> 10d
    3rd block -> 30d
    4th+ block -> permanent
    """
    suggested_tier, prev_count, current_score = await BlockService.get_suggested_tier(db, user_id)
    return BlockSuggestionResponse(
        user_id=user_id,
        previous_blocks_count=prev_count,
        suggested_duration_tier=suggested_tier,
        current_credibility_score=current_score
    )


@router.post("/users/{user_id}/block", response_model=BlockHistoryResponse, status_code=status.HTTP_201_CREATED)
async def block_user(
    data: BlockUserRequest,
    user_id: int = Path(...),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """
    Admin issues a block for a citizen.
    Duration tier options: 3d | 10d | 30d | permanent.
    """
    block_entry = await BlockService.issue_block(
        db=db,
        user_id=user_id,
        admin_id=current_user.id,
        duration_tier=data.duration_tier,
        reason=data.reason
    )
    resp = BlockHistoryResponse.model_validate(block_entry)
    resp.issued_by_admin_name = current_user.name
    return resp


@router.get("/users/{user_id}/block-history", response_model=List[BlockHistoryResponse])
async def get_block_history(
    user_id: int = Path(...),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """
    Full audit trail of all previous and active blocks for a citizen.
    """
    history = await BlockService.get_user_block_history(db, user_id)
    return [BlockHistoryResponse.model_validate(b) for b in history]
