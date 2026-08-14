from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from core.models.blocked_users import BlockDurationTier


class BlockUserRequest(BaseModel):
    duration_tier: BlockDurationTier = Field(..., description="Duration tier: 3d, 10d, 30d, permanent")
    reason: str = Field(..., min_length=3, max_length=500, description="Reason for issuing the block")


class BlockHistoryResponse(BaseModel):
    id: int
    user_id: int
    block_start_at: datetime
    block_end_at: Optional[datetime] = None
    duration_tier: BlockDurationTier
    reason: str
    issued_by_admin_id: Optional[int] = None
    issued_by_admin_name: Optional[str] = None
    is_active: bool
    score_at_unblock: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


class BlockSuggestionResponse(BaseModel):
    user_id: int
    previous_blocks_count: int
    suggested_duration_tier: BlockDurationTier
    current_credibility_score: float
