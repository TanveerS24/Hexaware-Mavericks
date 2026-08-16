from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class CredibilityLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    delta: float
    reason: str
    issue_id: Optional[int] = None
    created_at: datetime


class LowCredibilityUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    name: str
    email: str
    phone: Optional[str] = None
    credibility_score: float
    status: str
    is_blocked: bool
    blocked_until: Optional[datetime] = None
    total_flags: int


class CredibilityHistoryResponse(BaseModel):
    user_id: int
    current_score: float
    status: str
    logs: List[CredibilityLogResponse]
