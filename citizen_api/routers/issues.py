from typing import Optional, List
from fastapi import (
    APIRouter,
    Depends,
    status,
    UploadFile,
    File,
    Form,
    Query
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.db.session import get_db
from core.exceptions import NotFoundError, ForbiddenError
from core.models.users import User
from core.models.issues import Issue, IssueStatus
from core.schemas.issue import (
    IssueCreateRequest,
    IssueResponse,
    IssueListResponse,
    DuplicateCheckResult
)
from core.security import get_current_user
from core.services.block_service import require_not_blocked
from core.services.issue_service import IssueService

router = APIRouter(prefix="/issues", tags=["Citizen Grievances"])


@router.post("", response_model=IssueResponse, status_code=status.HTTP_201_CREATED)
async def create_issue(
    data: Optional[IssueCreateRequest] = None,
    transcript: Optional[str] = Form(None),
    location_lat: Optional[float] = Form(None),
    location_lng: Optional[float] = Form(None),
    ward: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    audio_file: Optional[UploadFile] = File(None),
    current_user: User = Depends(require_not_blocked),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new citizen grievance.
    Guarded strictly by require_not_blocked dependency (rejects with 403 account_blocked if blocked).
    Supports either JSON body or multipart/form-data for audio recordings.
    """
    audio_bytes = None
    if audio_file:
        audio_bytes = await audio_file.read()

    # Normalize input from either JSON or Form
    if data:
        req_data = data
    else:
        req_data = IssueCreateRequest(
            transcript=transcript or "Audio grievance submission",
            location_lat=location_lat,
            location_lng=location_lng,
            ward=ward,
            category=category
        )

    issue, dup_info = await IssueService.create_citizen_issue(
        db=db,
        citizen=current_user,
        data=req_data,
        audio_bytes=audio_bytes
    )

    resp = IssueResponse.model_validate(issue)
    resp.citizen_name = current_user.name
    resp.citizen_phone = current_user.phone
    resp.duplicate_info = dup_info
    return resp


@router.get("", response_model=IssueListResponse)
async def list_my_issues(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all grievances submitted by the current citizen.
    """
    stmt = (
        select(Issue)
        .options(
            selectinload(Issue.citizen),
            selectinload(Issue.department),
            selectinload(Issue.status_history)
        )
        .where(Issue.citizen_id == current_user.id)
        .order_by(Issue.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    items = result.scalars().all()

    # Count total
    from sqlalchemy import func
    count_stmt = select(func.count(Issue.id)).where(Issue.citizen_id == current_user.id)
    total_res = await db.execute(count_stmt)
    total = total_res.scalar_one()

    resp_items = []
    for iss in items:
        ir = IssueResponse.model_validate(iss)
        ir.citizen_name = current_user.name
        ir.department_name = iss.department.name if iss.department else None
        resp_items.append(ir)

    return IssueListResponse(total=total, items=resp_items)


@router.get("/{issue_id_or_code}", response_model=IssueResponse)
async def get_issue_detail(
    issue_id_or_code: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed grievance record by public tracking code (ISS-2026-XXXXXX) or ID.
    Citizens can view their own issues (or public tracking info).
    """
    issue = await IssueService.get_issue_by_id(db, issue_id_or_code)
    if not issue:
        raise NotFoundError(f"Issue '{issue_id_or_code}' not found")

    if current_user.role == "citizen" and issue.citizen_id != current_user.id:
        raise ForbiddenError("You are not authorized to view this grievance")

    resp = IssueResponse.model_validate(issue)
    resp.citizen_name = issue.citizen.name if issue.citizen else None
    resp.citizen_phone = issue.citizen.phone if issue.citizen else None
    resp.department_name = issue.department.name if issue.department else None
    return resp
