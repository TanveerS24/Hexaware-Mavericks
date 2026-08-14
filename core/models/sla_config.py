from datetime import datetime
from sqlalchemy import String, Integer, DateTime, func, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from core.db.base import Base


class SLAConfig(Base):
    __tablename__ = "sla_config"
    __table_args__ = (
        UniqueConstraint("category", "priority", name="uq_category_priority"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, index=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    priority: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    sla_hours: Mapped[int] = mapped_column(Integer, nullable=False, default=48)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
