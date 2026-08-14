from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.db.session import get_db
from core.models.announcements import Announcement
from core.schemas.announcement import AnnouncementResponse, AnnouncementListResponse

router = APIRouter(prefix="/announcements", tags=["Announcements"])


@router.get("", response_model=AnnouncementListResponse)
async def list_announcements(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    Public municipal announcements and alerts.
    Exempt from mandatory authentication.
    """
    stmt = select(Announcement).order_by(Announcement.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(stmt)
    items = result.scalars().all()

    from sqlalchemy import func
    count_stmt = select(func.count(Announcement.id))
    total_res = await db.execute(count_stmt)
    total = total_res.scalar_one()

    return AnnouncementListResponse(
        total=total,
        items=[AnnouncementResponse.model_validate(a) for a in items]
    )
