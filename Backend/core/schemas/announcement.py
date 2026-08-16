from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


class AnnouncementCreateRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    body: str = Field(..., min_length=5)


class AnnouncementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    body: str
    published_by_admin_id: Optional[int] = None
    created_at: datetime


class AnnouncementListResponse(BaseModel):
    total: int
    items: List[AnnouncementResponse]
