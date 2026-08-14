from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.db.session import get_db
from core.models.knowledge_base import KnowledgeBase
from core.models.departments import Department
from core.schemas.knowledge_base import FAQResponse

router = APIRouter(prefix="/faq", tags=["Public FAQs & Knowledge"])


@router.get("", response_model=List[FAQResponse])
async def list_faqs(
    department_id: Optional[int] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    Public FAQ and municipal service guidance.
    Exempt from mandatory authentication.
    """
    stmt = (
        select(KnowledgeBase)
        .options(selectinload(KnowledgeBase.department))
        .order_by(KnowledgeBase.created_at.desc())
        .limit(limit)
    )
    if department_id:
        stmt = stmt.where(KnowledgeBase.department_id == department_id)

    result = await db.execute(stmt)
    entries = result.scalars().all()

    return [
        FAQResponse(
            id=entry.id,
            title=entry.title,
            content=entry.content,
            department_name=entry.department.name if entry.department else "General Information"
        )
        for entry in entries
    ]
