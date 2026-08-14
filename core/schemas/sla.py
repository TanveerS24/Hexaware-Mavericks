from datetime import datetime
from typing import List
from pydantic import BaseModel, Field


class SLAConfigCreateRequest(BaseModel):
    category: str = Field(..., min_length=2, max_length=100)
    priority: str = Field(..., description="high, medium, low")
    sla_hours: int = Field(..., gt=0, le=720, description="SLA duration in hours")


class SLAConfigResponse(BaseModel):
    id: int
    category: str
    priority: str
    sla_hours: int
    created_at: datetime

    class Config:
        from_attributes = True


class SLAConfigListResponse(BaseModel):
    total: int
    items: List[SLAConfigResponse]
