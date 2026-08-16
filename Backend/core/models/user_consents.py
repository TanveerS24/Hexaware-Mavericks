from datetime import datetime
from sqlalchemy import DateTime, Boolean, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.db.base import Base


class UserConsent(Base):
    __tablename__ = "user_consents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    terms_version: Mapped[str] = mapped_column(String(50), nullable=False)
    privacy_version: Mapped[str] = mapped_column(String(50), nullable=False)
    audio_consent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ai_processing_consent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    accepted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Relationships
    user = relationship("User")
