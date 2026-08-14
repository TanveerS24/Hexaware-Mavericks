from typing import Optional
from fastapi import APIRouter, Depends, Response, Cookie
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.db.session import get_db
from core.exceptions import UnauthorizedError
from core.models.users import UserRole
from core.schemas.auth import LoginRequest, TokenResponse, RefreshTokenRequest
from core.services.auth_service import AuthService

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
