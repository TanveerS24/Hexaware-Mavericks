from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession

from core.db.session import get_db
from core.models.users import User
from core.schemas.notification import NotificationResponse, NotificationListResponse
from core.security import get_current_user
from core.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Citizen Notifications"])


@router.get("", response_model=NotificationListResponse)
async def list_my_notifications(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List notifications for current citizen.
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


@router.patch("/{notification_id}/read")
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
