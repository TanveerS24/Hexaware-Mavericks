from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from core.db.session import get_db
from core.models.users import User, UserRole
from core.models.announcements import Announcement
from core.schemas.announcement import (
    AnnouncementCreateRequest,
    AnnouncementResponse,
    AnnouncementListResponse
)
from core.security import require_roles

router = APIRouter(prefix="/announcements", tags=["Admin Announcements"])


@router.post("", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
async def create_announcement(
    data: AnnouncementCreateRequest,
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """
    Publish a new city-wide public announcement.
    """
    announcement = Announcement(
        title=data.title.strip(),
        body=data.body.strip(),
        published_by_admin_id=current_user.id
    )
    db.add(announcement)
    await db.commit()
    await db.refresh(announcement)
    return announcement


@router.get("", response_model=AnnouncementListResponse)
async def list_announcements(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Announcement).order_by(Announcement.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(stmt)
    items = result.scalars().all()

    count_stmt = select(func.count(Announcement.id))
    total_res = await db.execute(count_stmt)
    total = total_res.scalar_one()

    return AnnouncementListResponse(
        total=total,
        items=[AnnouncementResponse.model_validate(a) for a in items]
    )
