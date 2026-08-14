from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class CredibilityLogResponse(BaseModel):
    id: int
    user_id: int
    delta: float
    reason: str
    issue_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class LowCredibilityUserResponse(BaseModel):
    user_id: int
    name: str
    email: str
    phone: Optional[str] = None
    credibility_score: float
    status: str
    is_blocked: bool
    blocked_until: Optional[datetime] = None
    total_flags: int

    class Config:
        from_attributes = True


class CredibilityHistoryResponse(BaseModel):
    user_id: int
    current_score: float
    status: str
    logs: List[CredibilityLogResponse]
