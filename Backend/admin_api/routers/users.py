from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from core.db.session import get_db
from core.models.users import User, UserRole, UserStatus
from core.schemas.auth import UserResponse
from core.schemas.user import (
    CreateStaffUserRequest,
    UserListResponse,
    OfficerApproveRequest,
    OfficerRejectRequest
)
from core.security import require_roles
from core.services.auth_service import AuthService
from fastapi import Path

router = APIRouter(prefix="/users", tags=["Admin User Management"])


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_staff_user(
    data: CreateStaffUserRequest,
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """
    Admin creates staff accounts (callcentre agents, field officers, or new admins).
    """
    user = await AuthService.create_staff_user(db, data)
    return user


@router.get("/pending-officers", response_model=UserListResponse)
async def list_pending_officers(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """
    List all field officers with 'pending' registration status awaiting admin authorization.
    """
    stmt = (
        select(User)
        .where(and_(User.role == UserRole.OFFICER, User.status == UserStatus.PENDING))
        .order_by(User.created_at.asc())
        .limit(limit)
        .offset(offset)
    )
    count_stmt = select(func.count(User.id)).where(
        and_(User.role == UserRole.OFFICER, User.status == UserStatus.PENDING)
    )

    try:
        result = await db.execute(stmt)
        users = result.scalars().all()
        total_res = await db.execute(count_stmt)
        total = total_res.scalar_one()
        if users:
            return UserListResponse(
                total=total,
                items=[UserResponse.model_validate(u) for u in users]
            )
    except Exception:
        pass

    # In-memory fallback
    from core.services.auth_service import IN_MEMORY_OFFICERS
    pending_mems = [
        UserResponse(
            id=o["id"],
            name=o["name"],
            email=o["email"],
            phone=o.get("phone"),
            role=o["role"],
            department_id=o.get("department_id"),
            designation=o.get("designation"),
            employee_id=o.get("employee_id"),
            status=o["status"],
            credibility_score=o.get("credibility_score", 1.0),
            created_at=o.get("created_at")
        )
        for o in IN_MEMORY_OFFICERS
        if o["status"] == UserStatus.PENDING
    ]
    return UserListResponse(
        total=len(pending_mems),
        items=pending_mems
    )


@router.post("/{user_id}/approve", response_model=UserResponse)
async def approve_officer(
    user_id: int = Path(..., description="ID of the pending officer"),
    data: Optional[OfficerApproveRequest] = None,
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """
    Admin approves a pending field officer account.
    Transitions status to 'active' and grants immediate login access.
    """
    dept_id = data.department_id if data else None
    notes = data.notes if data else None
    user = await AuthService.approve_officer(db, user_id=user_id, department_id=dept_id, notes=notes)
    return user


@router.post("/{user_id}/reject", response_model=UserResponse)
async def reject_officer(
    data: OfficerRejectRequest,
    user_id: int = Path(..., description="ID of the pending officer"),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """
    Admin rejects a pending field officer account with a reason displayed to the officer.
    """
    user = await AuthService.reject_officer(db, user_id=user_id, reason=data.reason)
    return user


@router.get("", response_model=UserListResponse)
async def list_users(
    role: Optional[UserRole] = Query(None, description="Filter by user role"),
    status: Optional[UserStatus] = Query(None, description="Filter by status (active, pending, rejected, banned)"),
    department_id: Optional[int] = Query(None, description="Filter by department"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """
    List all platform users with role and status filters.
    """
    stmt = select(User).order_by(User.created_at.desc()).limit(limit).offset(offset)
    count_stmt = select(func.count(User.id))

    conditions = []
    if role:
        conditions.append(User.role == role)
    if status:
        conditions.append(User.status == status)
    if department_id:
        conditions.append(User.department_id == department_id)

    if conditions:
        stmt = stmt.where(and_(*conditions))
        count_stmt = count_stmt.where(and_(*conditions))

    result = await db.execute(stmt)
    users = result.scalars().all()

    total_res = await db.execute(count_stmt)
    total = total_res.scalar_one()

    return UserListResponse(
        total=total,
        items=[UserResponse.model_validate(u) for u in users]
    )
