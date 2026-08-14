from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.db.session import get_db
from core.models.users import User, UserRole
from core.models.sla_config import SLAConfig
from core.schemas.sla import (
    SLAConfigCreateRequest,
    SLAConfigResponse,
    SLAConfigListResponse
)
from core.security import require_roles

router = APIRouter(prefix="/sla-config", tags=["SLA Configuration"])


@router.get("", response_model=SLAConfigListResponse)
async def get_sla_configs(
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """
    Get configured resolution SLA turnaround times per category and priority.
    """
    stmt = select(SLAConfig).order_by(SLAConfig.category.asc(), SLAConfig.priority.asc())
    result = await db.execute(stmt)
    items = result.scalars().all()

    return SLAConfigListResponse(
        total=len(items),
        items=[SLAConfigResponse.model_validate(s) for s in items]
    )


@router.post("", response_model=SLAConfigResponse, status_code=status.HTTP_201_CREATED)
async def set_sla_config(
    data: SLAConfigCreateRequest,
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """
    Create or update SLA resolution target (in hours) for a category and priority.
    """
    stmt = select(SLAConfig).where(
        SLAConfig.category.ilike(data.category.strip()),
        SLAConfig.priority == data.priority.lower().strip()
    )
    result = await db.execute(stmt)
    sla_entry = result.scalar_one_or_none()

    if sla_entry:
        sla_entry.sla_hours = data.sla_hours
    else:
        sla_entry = SLAConfig(
            category=data.category.strip(),
            priority=data.priority.lower().strip(),
            sla_hours=data.sla_hours
        )
        db.add(sla_entry)

    await db.commit()
    await db.refresh(sla_entry)
    return sla_entry
