from fastapi import APIRouter, Depends, Path
from sqlalchemy.ext.asyncio import AsyncSession

from core.db.session import get_db
from core.exceptions import NotFoundError, ForbiddenError
from core.models.users import User, UserRole
from core.schemas.issue import (
    IssueUpdateStatusRequest,
    IssueClaimRequest,
    IssueMarkMaliciousRequest,
    IssueResponse
)
from core.security import require_roles
from core.services.issue_service import IssueService

router = APIRouter(prefix="/issues", tags=["Officer Issue Redressal"])


@router.get("/{issue_id}", response_model=IssueResponse)
async def get_issue_detail(
    issue_id: str = Path(...),
    current_user: User = Depends(require_roles(UserRole.OFFICER, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """
    Get full grievance history and details.
    """
    issue = await IssueService.get_issue_by_id(db, issue_id)
    if not issue:
        raise NotFoundError(f"Issue '{issue_id}' not found")

    # If officer has department, ensure issue matches or is admin
    if current_user.role == UserRole.OFFICER and current_user.department_id:
        if issue.department_id and issue.department_id != current_user.department_id:
            raise ForbiddenError("This grievance belongs to another department")

    resp = IssueResponse.model_validate(issue)
    resp.citizen_name = issue.citizen.name if issue.citizen else None
    resp.citizen_phone = issue.citizen.phone if issue.citizen else None
    resp.department_name = issue.department.name if issue.department else None
    return resp


@router.patch("/{issue_id}/claim", response_model=IssueResponse)
async def claim_issue(
    data: IssueClaimRequest,
    issue_id: int = Path(...),
    current_user: User = Depends(require_roles(UserRole.OFFICER, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """
    Claim grievance ticket from department pool.
    Protected by optimistic locking (version column) to prevent concurrent claim collisions.
    """
    issue = await IssueService.claim_issue(
        db=db,
        issue_id=issue_id,
        officer=current_user,
        client_version=data.version
    )
    resp = IssueResponse.model_validate(issue)
    resp.citizen_name = issue.citizen.name if issue.citizen else None
    resp.department_name = issue.department.name if issue.department else None
    return resp


@router.patch("/{issue_id}/status", response_model=IssueResponse)
async def update_status(
    data: IssueUpdateStatusRequest,
    issue_id: int = Path(...),
    current_user: User = Depends(require_roles(UserRole.OFFICER, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """
    Update grievance status (in_progress, resolved).
    Uses optimistic locking (version) to prevent race conditions.
    """
    issue = await IssueService.update_issue_status(
        db=db,
        issue_id=issue_id,
        officer=current_user,
        data=data
    )
    resp = IssueResponse.model_validate(issue)
    resp.citizen_name = issue.citizen.name if issue.citizen else None
    resp.department_name = issue.department.name if issue.department else None
    return resp


@router.patch("/{issue_id}/mark-malicious", response_model=IssueResponse)
async def mark_malicious(
    data: IssueMarkMaliciousRequest,
    issue_id: int = Path(...),
    current_user: User = Depends(require_roles(UserRole.OFFICER, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """
    Field officer flags malicious or fraudulent grievance.
    Deducts 0.15 citizen credibility score, records log, and alerts admins if score < 0.5.
    """
    issue = await IssueService.mark_issue_malicious(
        db=db,
        issue_id=issue_id,
        staff_user=current_user,
        data=data
    )
    resp = IssueResponse.model_validate(issue)
    resp.citizen_name = issue.citizen.name if issue.citizen else None
    resp.department_name = issue.department.name if issue.department else None
    return resp
