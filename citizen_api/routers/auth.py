from typing import Optional
from fastapi import APIRouter, Depends, Response, Request, Cookie, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.db.session import get_db
from core.exceptions import UnauthorizedError
from core.models.users import User, UserRole
from core.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    MeResponse,
    UserResponse
)
from core.security import get_current_user
from core.services.auth_service import AuthService
from core.services.block_service import BlockService
from core.services.credibility_service import CredibilityService

router = APIRouter(tags=["Citizen Authentication"])


def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """Set secure httpOnly cookies for web browsers."""
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
async def register(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Public self-registration for citizens.
    """
    user = await AuthService.register_citizen(db, data)
    return user


@router.post("/auth/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """
    Citizen login. Returns access & refresh tokens in body and sets httpOnly cookies.
    """
    token_resp, raw_refresh = await AuthService.login(
        db=db,
        data=data,
        required_role=UserRole.CITIZEN
    )
    set_auth_cookies(response, token_resp.access_token, raw_refresh)
    return token_resp


@router.post("/auth/refresh", response_model=TokenResponse)
async def refresh_token(
    data: RefreshTokenRequest,
    request: Request,
    response: Response,
    refresh_cookie: Optional[str] = Cookie(None, alias="refresh_token"),
    db: AsyncSession = Depends(get_db)
):
    """
    Rotates refresh token. Detects token reuse and revokes compromised sessions.
    """
    token_val = data.refresh_token or refresh_cookie
    if not token_val:
        raise UnauthorizedError("Missing refresh token in request body or cookie")

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
    """
    Logout: revokes refresh token and clears auth cookies.
    """
    token_val = data.refresh_token or refresh_cookie
    if token_val:
        await AuthService.logout(db, token_val)

    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=MeResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns authenticated citizen's profile, including real-time block and credibility status.
    """
    # Lazy recalculation of recovered credibility score
    effective_score = await CredibilityService.get_effective_credibility_score(db, current_user)
    
    # Check block state
    is_blocked, active_block = await BlockService.is_user_blocked(db, current_user.id)

    return MeResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        phone=current_user.phone,
        role=current_user.role,
        department_id=current_user.department_id,
        credibility_score=effective_score,
        status=current_user.status,
        is_blocked=is_blocked,
        blocked_until=active_block.block_end_at if (is_blocked and active_block) else None,
        block_reason=active_block.reason if (is_blocked and active_block) else None,
        duration_tier=active_block.duration_tier.value if (is_blocked and active_block) else None,
        created_at=current_user.created_at
    )
