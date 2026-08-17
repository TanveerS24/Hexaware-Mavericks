from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, func, ARRAY, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.db.base import Base


class IssueEmbedding(Base):
    __tablename__ = "issue_embeddings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, index=True)
    issue_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("issues.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True
    )
    embedding = mapped_column(ARRAY(Float), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Relationships
    issue = relationship("Issue", back_populates="embedding_entry")
