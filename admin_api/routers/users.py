from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from core.db.session import get_db
from core.models.users import User, UserRole, UserStatus
from core.schemas.auth import UserResponse
from core.schemas.user import CreateStaffUserRequest, UserListResponse
from core.security import require_roles
from core.services.auth_service import AuthService

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


@router.get("", response_model=UserListResponse)
async def list_users(
    role: Optional[UserRole] = Query(None, description="Filter by user role"),
    status: Optional[UserStatus] = Query(None, description="Filter by status (active, banned)"),
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
