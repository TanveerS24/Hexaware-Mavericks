from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.db.session import get_db
from core.models.users import User, UserRole
from core.models.issues import IssuePriority, IssueStatus
from core.schemas.issue import IssueResponse, IssueListResponse
from core.security import require_roles
from core.services.issue_service import IssueService

router = APIRouter(prefix="/queue", tags=["Call Centre Queue"])


@router.get("", response_model=IssueListResponse)
async def get_callcentre_queue(
    priority: Optional[IssuePriority] = Query(None, description="Filter by priority (high, medium, low)"),
    department_id: Optional[int] = Query(None, description="Filter by department ID"),
    ward: Optional[str] = Query(None, description="Filter by ward name"),
    status: Optional[IssueStatus] = Query(None, description="Filter by grievance status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_roles(UserRole.CALLCENTRE, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """
    Queue endpoint for call centre agents.
    Returns grievances sorted by priority (high → medium → low), filterable by department, ward, and status.
    """
    issues, total = await IssueService.get_queue(
        db=db,
        department_id=department_id,
        ward=ward,
        priority=priority,
        status=status,
        limit=limit,
        offset=offset
    )

    items = []
    for iss in issues:
        resp = IssueResponse.model_validate(iss)
        resp.citizen_name = iss.citizen.name if iss.citizen else None
        resp.citizen_phone = iss.citizen.phone if iss.citizen else None
        resp.department_name = iss.department.name if iss.department else None
        items.append(resp)

    return IssueListResponse(total=total, items=items)
