from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.db.session import get_db
from core.models.users import User, UserRole
from core.models.issues import IssuePriority, IssueStatus
from core.schemas.issue import IssueResponse, IssueListResponse
from core.security import require_roles
from core.services.issue_service import IssueService

router = APIRouter(prefix="/issues", tags=["Admin Grievance Oversight"])


@router.get("", response_model=IssueListResponse)
async def list_all_issues(
    ward: Optional[str] = Query(None, description="Filter by location/ward"),
    department_id: Optional[int] = Query(None, description="Filter by department ID"),
    status: Optional[IssueStatus] = Query(None, description="Filter by status"),
    priority: Optional[IssuePriority] = Query(None, description="Filter by priority"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """
    City-wide grievance overview and search across all departments and locations.
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
