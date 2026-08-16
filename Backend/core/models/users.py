import enum
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Float, DateTime, ForeignKey, Enum, Boolean, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.db.base import Base


class UserRole(str, enum.Enum):
    CITIZEN = "citizen"
    OFFICER = "officer"
    ADMIN = "admin"


class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    BANNED = "banned"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role_enum", values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=UserRole.CITIZEN,
        index=True
    )
    department_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True
    )
    credibility_score: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    status: Mapped[UserStatus] = mapped_column(
        Enum(UserStatus, name="user_status_enum", values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=UserStatus.ACTIVE
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Relationships
    department = relationship("Department", back_populates="staff_members")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    blocks = relationship("BlockedUser", foreign_keys="[BlockedUser.user_id]", back_populates="user", cascade="all, delete-orphan")
    credibility_logs = relationship("CredibilityLog", back_populates="user", cascade="all, delete-orphan")
    issues = relationship("Issue", back_populates="citizen", foreign_keys="[Issue.citizen_id]")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
