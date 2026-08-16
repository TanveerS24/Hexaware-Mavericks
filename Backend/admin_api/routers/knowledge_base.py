from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.db.session import get_db
from core.models.users import User, UserRole
from core.models.knowledge_base import KnowledgeBase
from core.models.departments import Department
from core.schemas.knowledge_base import (
    KnowledgeBaseCreateRequest,
    KnowledgeBaseResponse,
    KnowledgeBaseListResponse
)
from core.security import require_roles

router = APIRouter(prefix="/knowledge-base", tags=["Knowledge Base & FAQ Management"])


@router.post("", response_model=KnowledgeBaseResponse, status_code=status.HTTP_201_CREATED)
async def create_knowledge_base_article(
    data: KnowledgeBaseCreateRequest,
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """
    Add a new knowledge base article or FAQ guide.
    Articles are stored and searchable by keyword matching via the chatbot.
    """
    article = KnowledgeBase(
        department_id=data.department_id,
        title=data.title.strip(),
        content=data.content.strip(),
        embedding=None  # No vector embedding — chatbot uses keyword search
    )
    db.add(article)
    await db.commit()
    await db.refresh(article)

    dept_name = None
    if article.department_id:
        dept_res = await db.execute(select(Department).where(Department.id == article.department_id))
        dept = dept_res.scalar_one_or_none()
        dept_name = dept.name if dept else None

    resp = KnowledgeBaseResponse.model_validate(article)
    resp.department_name = dept_name
    return resp


@router.get("", response_model=KnowledgeBaseListResponse)
async def list_knowledge_base(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """
    List all knowledge base entries.
    """
    stmt = (
        select(KnowledgeBase)
        .options(selectinload(KnowledgeBase.department))
        .order_by(KnowledgeBase.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    items = result.scalars().all()

    total_res = await db.execute(select(func.count(KnowledgeBase.id)))
    total = total_res.scalar_one()

    resp_items = []
    for item in items:
        resp = KnowledgeBaseResponse.model_validate(item)
        resp.department_name = item.department.name if item.department else None
        resp_items.append(resp)

    return KnowledgeBaseListResponse(total=total, items=resp_items)
