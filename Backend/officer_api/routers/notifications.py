from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update

from core.db.session import get_db
from core.models.users import User
from core.schemas.notification import NotificationResponse, NotificationListResponse
from core.security import get_current_user
from core.services.notification_service import NotificationService
from core.models.notifications import Notification

router = APIRouter(tags=["Officer & General Notifications"])


@router.get("/officer/notifications", response_model=NotificationListResponse)
async def list_officer_notifications(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List notifications for the authenticated officer.
    """
    items, total, unread = await NotificationService.get_user_notifications(
        db=db,
        user_id=current_user.id,
        limit=limit,
        offset=offset
    )

    return NotificationListResponse(
        total=total,
        unread_count=unread,
        items=[NotificationResponse.model_validate(n) for n in items]
    )


@router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: int = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Mark a notification as read.
    """
    success = await NotificationService.mark_as_read(
        db=db,
        notification_id=notification_id,
        user_id=current_user.id
    )
    return {"success": success, "message": "Notification marked as read"}


@router.patch("/notifications/read-all")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Mark all notifications for current user as read.
    """
    stmt = (
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.is_read == False)
        .values(is_read=True)
    )
    res = await db.execute(stmt)
    await db.commit()
    return {"success": True, "message": f"All ({res.rowcount}) notifications marked as read"}
