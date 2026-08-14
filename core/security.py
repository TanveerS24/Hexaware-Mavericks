import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Any, Dict
import jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, Request, status, Cookie
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.db.session import get_db
from core.exceptions import UnauthorizedError, ForbiddenError, BlockedUserError
from core.models.users import User, UserRole, UserStatus

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


def hash_token(raw_token: str) -> str:
    """Compute SHA-256 hash of a token string for safe database storage."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def generate_secure_token(nbytes: int = 48) -> str:
    """Generate a cryptographically secure random urlsafe token."""
    return secrets.token_urlsafe(nbytes)


def create_access_token(
    user_id: int,
    role: str,
    department_id: Optional[int] = None,
    name: Optional[str] = None,
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a signed JWT access token.
    """
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload: Dict[str, Any] = {
        "sub": str(user_id),
        "user_id": user_id,
        "role": role,
        "department_id": department_id,
        "name": name,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "type": "access"
    }

    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token


def decode_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate a JWT access token.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise UnauthorizedError("Access token has expired")
    except jwt.InvalidTokenError:
        raise UnauthorizedError("Invalid access token")


async def get_token_from_request(
    request: Request,
    bearer_auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    access_token_cookie: Optional[str] = Cookie(None, alias="access_token")
) -> Optional[str]:
    """
    Extract token from either Authorization header or httpOnly cookie.
    """
    if bearer_auth and bearer_auth.credentials:
        return bearer_auth.credentials
    if access_token_cookie:
        return access_token_cookie
    # Check raw header as fallback
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:].strip()
    return None


async def get_current_user_payload(
    request: Request,
    token: Optional[str] = Depends(get_token_from_request)
) -> Dict[str, Any]:
    """
    Dependency that decodes token and returns payload dict.
    """
    # Check if middleware already authenticated the request
    if hasattr(request.state, "user_payload") and request.state.user_payload:
        return request.state.user_payload

    if not token:
        raise UnauthorizedError("Missing authentication token")
    
    payload = decode_token(token)
    request.state.user_payload = payload
    return payload


async def get_current_user(
    payload: Dict[str, Any] = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Dependency that fetches the active User instance from database.
    """
    user_id = int(payload.get("user_id", payload.get("sub", 0)))
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise UnauthorizedError("User account not found")

    if user.status == UserStatus.BANNED:
        raise ForbiddenError("Account is permanently banned")

    return user


def require_roles(*allowed_roles: UserRole):
    """
    FastAPI dependency factory enforcing role-based access control.
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise ForbiddenError(
                f"Access denied: Required role in {[r.value for r in allowed_roles]}, "
                f"but your role is {current_user.role.value}"
            )
        return current_user
    return role_checker
