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


# JWKS Client for Supabase public keys
_jwks_client: Optional[jwt.PyJWKClient] = None

def get_jwks_client() -> Optional[jwt.PyJWKClient]:
    global _jwks_client
    if _jwks_client is None and settings.SUPABASE_JWKS_URL:
        try:
            _jwks_client = jwt.PyJWKClient(settings.SUPABASE_JWKS_URL, cache_jwk_set=True, lifespan=3600)
        except Exception:
            _jwks_client = None
    return _jwks_client


def decode_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate a JWT access token using either HS256 secret keys
    or Supabase JWKS asymmetric keys.
    """
    # 1. Try HS256 with JWT_SECRET_KEY / SUPABASE_SECRET_KEY
    secrets_to_try = [settings.JWT_SECRET_KEY]
    if settings.SUPABASE_SECRET_KEY and settings.SUPABASE_SECRET_KEY not in secrets_to_try:
        secrets_to_try.append(settings.SUPABASE_SECRET_KEY)

    for sec in secrets_to_try:
        try:
            payload = jwt.decode(
                token,
                sec,
                algorithms=["HS256", "HS384", "HS512"]
            )
            return payload
        except jwt.ExpiredSignatureError:
            raise UnauthorizedError("Access token has expired")
        except jwt.InvalidTokenError:
            continue

    # 2. Try Supabase JWKS client (RS256 / ES256)
    jwks = get_jwks_client()
    if jwks:
        try:
            signing_key = jwks.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256", "ES256"]
            )
            return payload
        except jwt.ExpiredSignatureError:
            raise UnauthorizedError("Access token has expired")
        except Exception:
            pass

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
    Falls back to a payload-constructed User when the DB is offline.
    """
    user_id_raw = payload.get("user_id", payload.get("sub"))
    email_raw = payload.get("email")

    user = None
    try:
        if user_id_raw is not None:
            if isinstance(user_id_raw, int) or (isinstance(user_id_raw, str) and user_id_raw.isdigit()):
                result = await db.execute(select(User).where(User.id == int(user_id_raw)))
                user = result.scalar_one_or_none()

        if not user and email_raw:
            result = await db.execute(select(User).where(User.email == email_raw.lower().strip()))
            user = result.scalar_one_or_none()
    except Exception:
        # DB is offline — construct a minimal User from JWT payload claims
        pass

    if not user:
        # Try to build a User from the token payload (DB-offline fallback)
        role_raw = payload.get("role")
        name_raw = payload.get("name", "Unknown")
        dept_raw = payload.get("department_id")
        if user_id_raw is not None and role_raw:
            try:
                role_enum = UserRole(role_raw)
                user = User(
                    id=int(user_id_raw) if str(user_id_raw).isdigit() else 0,
                    name=name_raw,
                    email=email_raw or f"{role_raw}@local",
                    password_hash="",
                    role=role_enum,
                    department_id=dept_raw,
                    credibility_score=1.0,
                    status=UserStatus.ACTIVE,
                    created_at=__import__('datetime').datetime.now(__import__('datetime').timezone.utc)
                )
            except Exception:
                pass

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
