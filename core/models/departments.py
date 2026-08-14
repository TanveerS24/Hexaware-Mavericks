from typing import Optional, List
from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.db.base import Base


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    jurisdiction_area: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Relationships
    staff_members = relationship("User", back_populates="department")
    issues = relationship("Issue", back_populates="department")
    knowledge_base_entries = relationship("KnowledgeBase", back_populates="department", cascade="all, delete-orphan")
