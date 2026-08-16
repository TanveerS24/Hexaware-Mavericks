from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    message: str
    is_read: bool
    notification_type: str
    created_at: datetime


class NotificationListResponse(BaseModel):
    total: int
    unread_count: int
    items: List[NotificationResponse]
