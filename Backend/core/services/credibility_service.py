from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.models.users import User, UserRole, UserStatus
from core.models.credibility_log import CredibilityLog
from core.models.blocked_users import BlockedUser, BlockDurationTier
from core.models.notifications import Notification, NotificationType


def calculate_recovered_score(
    score_at_unblock: float,
    block_duration_days: float,
    days_since_unblock: float,
    target_score: float = settings.RECOVERY_TARGET_SCORE,
    multiplier: float = settings.RECOVERY_PERIOD_MULTIPLIER
) -> float:
    """
    Pure calculation function for gradual credibility recovery after a temporary block.
    recovery_period_days = 2 * block_duration_days
    target_score = 0.7
    daily_rate = (target_score - score_at_unblock) / recovery_period_days
    current_score = min(target_score, score_at_unblock + daily_rate * days_since_unblock)
    """
    if score_at_unblock >= target_score:
        return target_score

    if block_duration_days <= 0 or days_since_unblock <= 0:
        return score_at_unblock

    recovery_period_days = multiplier * block_duration_days
    if recovery_period_days <= 0:
        return target_score

    daily_rate = (target_score - score_at_unblock) / recovery_period_days
    recovered_score = score_at_unblock + (daily_rate * days_since_unblock)
    return round(min(target_score, max(score_at_unblock, recovered_score)), 4)


class CredibilityService:
    """
    Manages citizen credibility scoring, malicious penalties,
    admin alerts, and lazy unblock score recovery.
    """

    @staticmethod
    async def penalize_malicious_issue(
        db: AsyncSession,
        citizen_id: int,
        issue_id: Optional[int],
        reason: str
    ) -> float:
        """
        Deducts penalty (0.15) from citizen's credibility score on malicious flag.
        Logs to credibility_log. If score < 0.5, notifies all administrators.
        """
        result = await db.execute(select(User).where(User.id == citizen_id))
        citizen = result.scalar_one_or_none()
        if not citizen:
            return 0.0

        old_score = citizen.credibility_score
        penalty = settings.MALICIOUS_PENALTY
        new_score = round(max(0.0, old_score - penalty), 4)
        citizen.credibility_score = new_score

        # Log change
        log_entry = CredibilityLog(
            user_id=citizen.id,
            delta=-penalty,
            reason=reason or "malicious_flag",
            issue_id=issue_id
        )
        db.add(log_entry)

        # If dropped below threshold, alert admins
        if new_score < settings.LOW_CREDIBILITY_THRESHOLD and old_score >= settings.LOW_CREDIBILITY_THRESHOLD:
            # Fetch admins
            admin_res = await db.execute(
                select(User).where(User.role == UserRole.ADMIN, User.status == UserStatus.ACTIVE)
            )
            admins = admin_res.scalars().all()
            for admin in admins:
                notif = Notification(
                    user_id=admin.id,
                    title="Low Credibility Alert",
                    message=f"Citizen {citizen.name} (ID: {citizen.id}) credibility score dropped to {new_score:.2f} due to malicious grievance filing.",
                    notification_type=NotificationType.LOW_CREDIBILITY_ALERT.value
                )
                db.add(notif)

        await db.commit()
        await db.refresh(citizen)
        return new_score

    @staticmethod
    async def get_effective_credibility_score(db: AsyncSession, user: User) -> float:
        """
        Lazily recalculates credibility score if user has completed a block and is in recovery.
        """
        if user.status == UserStatus.BANNED:
            return 0.0

        # Find most recently ended block
        query = (
            select(BlockedUser)
            .where(
                BlockedUser.user_id == user.id,
                BlockedUser.is_active == False,
                BlockedUser.block_end_at.isnot(None),
                BlockedUser.score_at_unblock.isnot(None)
            )
            .order_by(BlockedUser.block_end_at.desc())
            .limit(1)
        )
        result = await db.execute(query)
        last_block = result.scalar_one_or_none()

        if not last_block or not last_block.block_end_at:
            return user.credibility_score

        # Map tier to days
        tier_days_map = {
            BlockDurationTier.THREE_DAYS: 3.0,
            BlockDurationTier.TEN_DAYS: 10.0,
            BlockDurationTier.THIRTY_DAYS: 30.0,
        }
        block_days = tier_days_map.get(last_block.duration_tier, 3.0)

        now = datetime.now(timezone.utc)
        block_end = last_block.block_end_at
        if block_end.tzinfo is None:
            block_end = block_end.replace(tzinfo=timezone.utc)

        if now <= block_end:
            return user.credibility_score

        days_since_unblock = (now - block_end).total_seconds() / 86400.0
        score_at_unblock = last_block.score_at_unblock or user.credibility_score

        computed_score = calculate_recovered_score(
            score_at_unblock=score_at_unblock,
            block_duration_days=block_days,
            days_since_unblock=days_since_unblock
        )

        # If updated score is higher than saved score, update in database lazily
        if computed_score > user.credibility_score:
            user.credibility_score = computed_score
            await db.commit()

        return user.credibility_score

    @staticmethod
    async def get_low_credibility_users(db: AsyncSession) -> List[dict]:
        """
        Returns list of citizens with credibility score < 0.5 for admin review.
        """
        query = (
            select(User)
            .where(
                User.role == UserRole.CITIZEN,
                User.credibility_score < settings.LOW_CREDIBILITY_THRESHOLD
            )
            .order_by(User.credibility_score.asc())
        )
        result = await db.execute(query)
        users = result.scalars().all()

        output = []
        for u in users:
            # count malicious logs
            logs_query = select(CredibilityLog).where(
                CredibilityLog.user_id == u.id,
                CredibilityLog.delta < 0
            )
            logs_res = await db.execute(logs_query)
            flags_count = len(logs_res.scalars().all())

            # check block status
            active_block_query = select(BlockedUser).where(
                BlockedUser.user_id == u.id,
                BlockedUser.is_active == True
            )
            block_res = await db.execute(active_block_query)
            active_block = block_res.scalar_one_or_none()

            output.append({
                "user_id": u.id,
                "name": u.name,
                "email": u.email,
                "phone": u.phone,
                "credibility_score": u.credibility_score,
                "status": u.status.value,
                "is_blocked": active_block is not None,
                "blocked_until": active_block.block_end_at if active_block else None,
                "total_flags": flags_count
            })
        return output
