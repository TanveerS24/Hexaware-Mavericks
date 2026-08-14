import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Float, DateTime, ForeignKey, Enum, Boolean, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.db.base import Base


class BlockDurationTier(str, enum.Enum):
    THREE_DAYS = "3d"
    TEN_DAYS = "10d"
    THIRTY_DAYS = "30d"
    PERMANENT = "permanent"


class BlockedUser(Base):
    __tablename__ = "blocked_users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    block_start_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    block_end_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True
    )
    duration_tier: Mapped[BlockDurationTier] = mapped_column(
        Enum(BlockDurationTier, name="block_duration_tier_enum", values_callable=lambda obj: [e.value for e in obj]),
        nullable=False
    )
    reason: Mapped[str] = mapped_column(String(500), nullable=False)
    issued_by_admin_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    score_at_unblock: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="blocks")
    issued_by_admin = relationship("User", foreign_keys=[issued_by_admin_id])
