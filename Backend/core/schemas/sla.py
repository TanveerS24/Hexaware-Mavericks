from datetime import datetime
from typing import List
from pydantic import BaseModel, ConfigDict, Field


class SLAConfigCreateRequest(BaseModel):
    category: str = Field(..., min_length=2, max_length=100)
    priority: str = Field(..., description="high, medium, low")
    sla_hours: int = Field(..., gt=0, le=720, description="SLA duration in hours")


class SLAConfigResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category: str
    priority: str
    sla_hours: int
    created_at: datetime


class SLAConfigListResponse(BaseModel):
    total: int
    items: List[SLAConfigResponse]
