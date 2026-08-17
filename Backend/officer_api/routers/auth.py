from typing import Optional
from fastapi import APIRouter, Depends, Response, Cookie
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.db.session import get_db
from core.exceptions import UnauthorizedError
from core.schemas.auth import LoginRequest, TokenResponse, RefreshTokenRequest, OfficerRegisterRequest, UserResponse
from core.services.auth_service import AuthService
from core.models.users import UserRole, User
from core.security import get_current_user
from fastapi import status

router = APIRouter(tags=["Officer Authentication"])


def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=(settings.ENVIRONMENT == "production"),
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=(settings.ENVIRONMENT == "production"),
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400
    )


@router.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@router.post("/auth/register/officer", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_officer(
    data: OfficerRegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Field Officer self-registration.
    Creates account in 'pending' status awaiting administrative approval.
    """
    user = await AuthService.register_officer(db=db, data=data)
    try:
        from core.services.websocket_manager import ws_manager
        await ws_manager.broadcast_json({
            "type": "NEW_OFFICER_REGISTRATION",
            "officer": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "phone": user.phone,
                "department": data.department or "Water & Sanitation Dept",
                "department_id": user.department_id or 1,
                "role": "officer",
                "designation": user.designation or "Field Inspector",
                "employee_id": user.employee_id or f"GOV-2026-OFF-{user.id}",
                "region": data.region or "Ward 4 (Central)",
                "status": "pending",
                "applied_at": "Just now",
                "credibility_score": 1.0,
                "rejection_reason": None,
                "notes": f"Self-registered from Field Officer Portal ({user.email}). Awaiting admin verification."
            }
        })
    except Exception:
        pass
    return user


@router.post("/auth/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """
    Field Officer login.
    """
    token_resp, raw_refresh = await AuthService.login(
        db=db,
        data=data,
        required_role=UserRole.OFFICER
    )
    set_auth_cookies(response, token_resp.access_token, raw_refresh)
    return token_resp


@router.post("/auth/refresh", response_model=TokenResponse)
async def refresh_token(
    data: RefreshTokenRequest,
    response: Response,
    refresh_cookie: Optional[str] = Cookie(None, alias="refresh_token"),
    db: AsyncSession = Depends(get_db)
):
    token_val = data.refresh_token or refresh_cookie
    if not token_val:
        raise UnauthorizedError("Missing refresh token")

    token_resp, new_refresh = await AuthService.rotate_refresh_token(
        db=db,
        raw_refresh_token=token_val,
        device_info=data.device_info
    )
    set_auth_cookies(response, token_resp.access_token, new_refresh)
    return token_resp


@router.post("/auth/logout")
async def logout(
    data: RefreshTokenRequest,
    response: Response,
    refresh_cookie: Optional[str] = Cookie(None, alias="refresh_token"),
    db: AsyncSession = Depends(get_db)
):
    token_val = data.refresh_token or refresh_cookie
    if token_val:
        await AuthService.logout(db, token_val)

    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}


@router.get("/me")
async def get_officer_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the authenticated officer's profile with lazy-load and offline fallbacks.
    """
    # For department name
    dept_name = None
    if current_user.department_id:
        try:
            # Try to fetch department from database if online
            from core.models.departments import Department
            from sqlalchemy import select
            result = await db.execute(select(Department).where(Department.id == current_user.department_id))
            dept = result.scalar_one_or_none()
            if dept:
                dept_name = dept.name
        except Exception:
            pass

    # If DB is offline or department name not found in DB, try to find in IN_MEMORY_OFFICERS
    if not dept_name:
        try:
            from core.services.auth_service import _load_persisted_officers
            IN_MEMORY_OFFICERS = _load_persisted_officers()
            for off in IN_MEMORY_OFFICERS:
                if off["email"].lower() == current_user.email.lower():
                    dept_name = off.get("department")
                    break
        except Exception:
            pass

    # Default fallback department name if none found
    if not dept_name:
        dept_name = "Water & Sanitation Dept"

    # Region (we mapped region to area and city during registration)
    region = current_user.area or current_user.city
    if not region:
        try:
            from core.services.auth_service import _load_persisted_officers
            IN_MEMORY_OFFICERS = _load_persisted_officers()
            for off in IN_MEMORY_OFFICERS:
                if off["email"].lower() == current_user.email.lower():
                    region = off.get("region")
                    break
        except Exception:
            pass
    if not region:
        region = "Ward 4 (Central)"

    user_data = {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "phone": current_user.phone,
        "role": current_user.role,
        "department_id": current_user.department_id,
        "department": dept_name,
        "region": region,
        "designation": current_user.designation,
        "employee_id": current_user.employee_id,
        "status": current_user.status,
        "credibility_score": current_user.credibility_score
    }
    return {"user": user_data}
