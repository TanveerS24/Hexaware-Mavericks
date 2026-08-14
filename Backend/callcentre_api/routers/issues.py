from fastapi import APIRouter, Depends, Path, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.db.session import get_db
from core.exceptions import NotFoundError
from core.models.users import User, UserRole
from core.schemas.issue import (
    CallCentreManualIssueRequest,
    IssueForwardRequest,
    IssueResolveRequest,
    IssueMarkMaliciousRequest,
    IssueResponse
)
from core.security import require_roles
from core.services.issue_service import IssueService

router = APIRouter(prefix="/issues", tags=["Call Centre Issue Management"])


@router.post("", response_model=IssueResponse, status_code=status.HTTP_201_CREATED)
async def create_manual_issue(
    data: CallCentreManualIssueRequest,
    current_user: User = Depends(require_roles(UserRole.CALLCENTRE, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """
    Call Centre agent logs a manual grievance ticket on behalf of a citizen calling in.
    """
    issue = await IssueService.create_manual_issue(
        db=db,
        staff_user=current_user,
        data=data
    )
    resp = IssueResponse.model_validate(issue)
    resp.citizen_name = issue.citizen.name if issue.citizen else None
    resp.citizen_phone = issue.citizen.phone if issue.citizen else None
    resp.department_name = issue.department.name if issue.department else None
    return resp


@router.get("/{issue_id}", response_model=IssueResponse)
async def get_issue_detail(
    issue_id: str = Path(...),
    current_user: User = Depends(require_roles(UserRole.CALLCENTRE, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """
    Get full grievance history and details.
    """
    issue = await IssueService.get_issue_by_id(db, issue_id)
    if not issue:
        raise NotFoundError(f"Issue '{issue_id}' not found")

    resp = IssueResponse.model_validate(issue)
    resp.citizen_name = issue.citizen.name if issue.citizen else None
    resp.citizen_phone = issue.citizen.phone if issue.citizen else None
    resp.department_name = issue.department.name if issue.department else None
    return resp


@router.patch("/{issue_id}/forward", response_model=IssueResponse)
async def forward_issue(
    data: IssueForwardRequest,
    issue_id: int = Path(...),
    current_user: User = Depends(require_roles(UserRole.CALLCENTRE, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """
    Forward issue to a specific department.
    Broadcasts grievance to the department's shared claimable pool.
    """
    issue = await IssueService.forward_issue(
        db=db,
        issue_id=issue_id,
        staff_user=current_user,
        data=data
    )
    resp = IssueResponse.model_validate(issue)
    resp.citizen_name = issue.citizen.name if issue.citizen else None
    resp.department_name = issue.department.name if issue.department else None
    return resp


@router.patch("/{issue_id}/resolve", response_model=IssueResponse)
async def resolve_issue(
    data: IssueResolveRequest,
    issue_id: int = Path(...),
    current_user: User = Depends(require_roles(UserRole.CALLCENTRE, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """
    Call centre agent directly resolves simple issues without officer escalation.
    """
    issue = await IssueService.resolve_issue(
        db=db,
        issue_id=issue_id,
        staff_user=current_user,
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
    current_user: User = Depends(require_roles(UserRole.CALLCENTRE, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """
    Mark grievance as malicious / spam.
    Automatically applies 0.15 score penalty to citizen, records log, and alerts admins if score < 0.5.
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
