from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple, List
from fastapi import Depends
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.db.session import get_db
from core.exceptions import NotFoundError, BlockedUserError, ForbiddenError
from core.models.users import User, UserStatus
from core.models.blocked_users import BlockedUser, BlockDurationTier
from core.models.notifications import Notification, NotificationType
from core.security import get_current_user


def get_suggested_tier_from_count(previous_block_count: int) -> BlockDurationTier:
    """
    Suggests next block duration tier based on prior block occurrences:
    1st block (count=0) -> 3d
    2nd block (count=1) -> 10d
    3rd block (count=2) -> 30d
    4th+ block (count>=3) -> permanent
    """
    if previous_block_count == 0:
        return BlockDurationTier.THREE_DAYS
    elif previous_block_count == 1:
        return BlockDurationTier.TEN_DAYS
    elif previous_block_count == 2:
        return BlockDurationTier.THIRTY_DAYS
    else:
        return BlockDurationTier.PERMANENT


class BlockService:
    """
    Manages account block issuance, tier auto-suggestions,
    lazy expiry checks, and block enforcement.
    """

    @staticmethod
    async def get_suggested_tier(db: AsyncSession, user_id: int) -> Tuple[BlockDurationTier, int, float]:
        """
        Calculates suggested next block tier for a citizen.
        Returns (suggested_tier, previous_blocks_count, current_credibility_score).
        """
        user_res = await db.execute(select(User).where(User.id == user_id))
        user = user_res.scalar_one_or_none()
        if not user:
            raise NotFoundError(f"User with ID {user_id} not found")

        count_res = await db.execute(
            select(func.count(BlockedUser.id)).where(BlockedUser.user_id == user_id)
        )
        previous_count = count_res.scalar_one() or 0
        suggested = get_suggested_tier_from_count(previous_count)

        return suggested, previous_count, user.credibility_score

    @staticmethod
    async def issue_block(
        db: AsyncSession,
        user_id: int,
        admin_id: int,
        duration_tier: BlockDurationTier,
        reason: str
    ) -> BlockedUser:
        """
        Admin action to issue a new block for a citizen.
        """
        user_res = await db.execute(select(User).where(User.id == user_id))
        user = user_res.scalar_one_or_none()
        if not user:
            raise NotFoundError(f"User with ID {user_id} not found")

        # Deactivate any prior active blocks
        await db.execute(
            update(BlockedUser)
            .where(BlockedUser.user_id == user_id, BlockedUser.is_active == True)
            .values(is_active=False)
        )

        now = datetime.now(timezone.utc)
        block_end_at: Optional[datetime] = None

        if duration_tier == BlockDurationTier.THREE_DAYS:
            block_end_at = now + timedelta(days=3)
        elif duration_tier == BlockDurationTier.TEN_DAYS:
            block_end_at = now + timedelta(days=10)
        elif duration_tier == BlockDurationTier.THIRTY_DAYS:
            block_end_at = now + timedelta(days=30)
        elif duration_tier == BlockDurationTier.PERMANENT:
            block_end_at = None
            user.status = UserStatus.BANNED

        block = BlockedUser(
            user_id=user_id,
            block_start_at=now,
            block_end_at=block_end_at,
            duration_tier=duration_tier,
            reason=reason.strip(),
            issued_by_admin_id=admin_id,
            is_active=True,
            score_at_unblock=None
        )
        db.add(block)

        # Notify the user
        end_desc = block_end_at.strftime("%Y-%m-%d %H:%M UTC") if block_end_at else "Permanent"
        notif = Notification(
            user_id=user_id,
            title="Account Block Notice",
            message=f"Your account complaint filing has been blocked ({duration_tier.value}). Reason: {reason}. Status until: {end_desc}.",
            notification_type=NotificationType.BLOCK_NOTICE.value
        )
        db.add(notif)

        await db.commit()
        await db.refresh(block)
        return block

    @staticmethod
    async def is_user_blocked(db: AsyncSession, user_id: int) -> Tuple[bool, Optional[BlockedUser]]:
        """
        Checks if a user is actively blocked. Lazily deactivates block if time has passed.
        Captures score_at_unblock on the moment block ends.
        """
        result = await db.execute(
            select(BlockedUser)
            .where(BlockedUser.user_id == user_id, BlockedUser.is_active == True)
            .order_by(BlockedUser.created_at.desc())
        )
        active_block = result.scalar_one_or_none()

        if not active_block:
            return False, None

        if active_block.duration_tier == BlockDurationTier.PERMANENT or active_block.block_end_at is None:
            return True, active_block

        now = datetime.now(timezone.utc)
        block_end = active_block.block_end_at
        if block_end.tzinfo is None:
            block_end = block_end.replace(tzinfo=timezone.utc)

        # Check if block has expired
        if now > block_end:
            # Auto-deactivate block
            active_block.is_active = False

            # Capture score_at_unblock if not stamped
            user_res = await db.execute(select(User).where(User.id == user_id))
            user = user_res.scalar_one_or_none()
            if user:
                active_block.score_at_unblock = user.credibility_score

            await db.commit()
            return False, None

        return True, active_block

    @staticmethod
    async def get_user_block_history(db: AsyncSession, user_id: int) -> List[BlockedUser]:
        """
        Fetches all past and current block entries for a user.
        """
        query = (
            select(BlockedUser)
            .where(BlockedUser.user_id == user_id)
            .order_by(BlockedUser.created_at.desc())
        )
        result = await db.execute(query)
        return list(result.scalars().all())


async def require_not_blocked(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    FastAPI dependency applied to issue-creation endpoints.
    Rejects request with 403 account_blocked if the user is currently blocked.
    """
    if current_user.status == UserStatus.BANNED:
        raise BlockedUserError(
            message="Your account is permanently banned from filing grievances.",
            reason="Permanent ban issued by administrator",
            duration_tier="permanent"
        )

    is_blocked, block_entry = await BlockService.is_user_blocked(db, current_user.id)
    if is_blocked and block_entry:
        end_str = block_entry.block_end_at.isoformat() if block_entry.block_end_at else "Permanent"
        raise BlockedUserError(
            message="Your account is temporarily blocked from raising new grievances.",
            reason=block_entry.reason,
            blocked_until=end_str,
            duration_tier=block_entry.duration_tier.value
        )

    return current_user
