from typing import List, Tuple, Optional
# pyrefly: ignore [missing-import]
from sqlalchemy import select, func, update
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
from core.models.notifications import Notification, NotificationType


class NotificationService:
    """
    Handles user notifications and alerts.
    """

    @staticmethod
    async def create_notification(
        db: AsyncSession,
        user_id: int,
        title: str,
        message: str,
        notification_type: str = NotificationType.INFO.value
    ) -> Notification:
        """Create and persist a new notification."""
        notif = Notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notification_type,
            is_read=False
        )
        db.add(notif)
        await db.commit()
        await db.refresh(notif)
        return notif

    @staticmethod
    async def get_user_notifications(
        db: AsyncSession,
        user_id: int,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[Notification], int, int]:
        """
        Returns (items, total_count, unread_count).
        """
        stmt = (
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await db.execute(stmt)
        items = list(result.scalars().all())

        total_res = await db.execute(
            select(func.count(Notification.id)).where(Notification.user_id == user_id)
        )
        total = total_res.scalar_one()

        unread_res = await db.execute(
            select(func.count(Notification.id)).where(
                Notification.user_id == user_id,
                Notification.is_read == False
            )
        )
        unread = unread_res.scalar_one()

        return items, total, unread

    @staticmethod
    async def mark_as_read(db: AsyncSession, notification_id: int, user_id: int) -> bool:
        """Mark a notification as read."""
        stmt = (
            update(Notification)
            .where(Notification.id == notification_id, Notification.user_id == user_id)
            .values(is_read=True)
        )
        res = await db.execute(stmt)
        await db.commit()
        return res.rowcount > 0
