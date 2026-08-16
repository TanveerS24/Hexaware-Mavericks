from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.exceptions import (
    UnauthorizedError,
    ForbiddenError,
    ConflictError,
    NotFoundError,
    ValidationError
)
from core.models.users import User, UserRole, UserStatus
from core.models.refresh_tokens import RefreshToken
from core.schemas.auth import RegisterRequest, LoginRequest, TokenResponse
from core.schemas.user import CreateStaffUserRequest
from core.security import (
    hash_password,
    verify_password,
    hash_token,
    generate_secure_token,
    create_access_token
)


class AuthService:
    """
    Handles authentication, registration, password verification,
    and refresh token rotation with reuse detection.
    """

    @staticmethod
    async def register_citizen(db: AsyncSession, data: RegisterRequest) -> User:
        """Register a new citizen account."""
        # Check email uniqueness
        existing_email = await db.execute(select(User).where(User.email == data.email))
        if existing_email.scalar_one_or_none():
            raise ConflictError("An account with this email address already exists")

        # Check phone uniqueness if provided
        if data.phone:
            existing_phone = await db.execute(select(User).where(User.phone == data.phone))
            if existing_phone.scalar_one_or_none():
                raise ConflictError("An account with this phone number already exists")

        user = User(
            name=data.name.strip(),
            email=data.email.lower().strip(),
            phone=data.phone.strip() if data.phone else None,
            password_hash=hash_password(data.password),
            role=UserRole.CITIZEN,
            credibility_score=settings.INITIAL_CREDIBILITY_SCORE,
            status=UserStatus.ACTIVE
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def create_staff_user(db: AsyncSession, data: CreateStaffUserRequest) -> User:
        """Admin-only: create officer or admin accounts."""
        if data.role == UserRole.CITIZEN:
            raise ValidationError("Citizen accounts should be created via public registration")

        existing = await db.execute(select(User).where(User.email == data.email))
        if existing.scalar_one_or_none():
            raise ConflictError("An account with this email address already exists")

        user = User(
            name=data.name.strip(),
            email=data.email.lower().strip(),
            phone=data.phone.strip() if data.phone else None,
            password_hash=hash_password(data.password),
            role=data.role,
            department_id=data.department_id,
            credibility_score=settings.INITIAL_CREDIBILITY_SCORE,
            status=UserStatus.ACTIVE
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def login(
        db: AsyncSession,
        data: LoginRequest,
        required_role: Optional[UserRole] = None
    ) -> Tuple[TokenResponse, str]:
        """
        Authenticate user and generate access token + new refresh token.
        Returns (TokenResponse, raw_refresh_token).
        """
        result = await db.execute(select(User).where(User.email == data.email.lower().strip()))
        user = result.scalar_one_or_none()

        if not user or not verify_password(data.password, user.password_hash):
            raise UnauthorizedError("Invalid email or password")

        if user.status == UserStatus.BANNED:
            raise ForbiddenError("This account has been permanently banned from the platform")

        if required_role and user.role != required_role:
            # Allow admin to login across portals if needed, else enforce matching portal
            if user.role != UserRole.ADMIN and user.role != required_role:
                raise ForbiddenError(f"Access denied: This portal is restricted to {required_role.value} accounts")

        # Generate tokens
        access_token = create_access_token(
            user_id=user.id,
            role=user.role.value,
            department_id=user.department_id,
            name=user.name
        )

        raw_refresh_token = generate_secure_token()
        token_hash_val = hash_token(raw_refresh_token)
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        refresh_entry = RefreshToken(
            user_id=user.id,
            token_hash=token_hash_val,
            device_info=data.device_info,
            issued_at=now,
            expires_at=expires_at,
            revoked=False
        )
        db.add(refresh_entry)
        await db.commit()

        token_response = TokenResponse(
            access_token=access_token,
            refresh_token=raw_refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            role=user.role.value,
            user_id=user.id,
            name=user.name,
            department_id=user.department_id
        )

        return token_response, raw_refresh_token

    @staticmethod
    async def rotate_refresh_token(
        db: AsyncSession,
        raw_refresh_token: str,
        device_info: Optional[str] = None
    ) -> Tuple[TokenResponse, str]:
        """
        Rotates refresh token. Detects token reuse (stolen/already rotated token)
        and revokes all active sessions for the user as a security measure.
        """
        token_hash_val = hash_token(raw_refresh_token)
        result = await db.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash_val)
        )
        token_entry = result.scalar_one_or_none()

        if not token_entry:
            raise UnauthorizedError("Invalid or unknown refresh token")

        user_id = token_entry.user_id

        # Token Reuse Detection: If the token is already revoked, an attacker or compromised client is reusing it
        if token_entry.revoked:
            # Force revoke ALL refresh tokens for this user
            await db.execute(
                update(RefreshToken)
                .where(RefreshToken.user_id == user_id)
                .values(revoked=True)
            )
            await db.commit()
            raise UnauthorizedError(
                "Security alert: Token reuse detected. All sessions for this account have been invalidated."
            )

        now = datetime.now(timezone.utc)
        if token_entry.expires_at < now:
            token_entry.revoked = True
            await db.commit()
            raise UnauthorizedError("Refresh token has expired. Please log in again.")

        # Revoke the current refresh token
        token_entry.revoked = True

        # Fetch user
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if not user or user.status == UserStatus.BANNED:
            await db.commit()
            raise ForbiddenError("Account is no longer active or is banned")

        # Issue new token pair
        access_token = create_access_token(
            user_id=user.id,
            role=user.role.value,
            department_id=user.department_id,
            name=user.name
        )

        new_raw_refresh = generate_secure_token()
        new_token_hash = hash_token(new_raw_refresh)
        new_refresh_entry = RefreshToken(
            user_id=user.id,
            token_hash=new_token_hash,
            device_info=device_info or token_entry.device_info,
            issued_at=now,
            expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
            revoked=False
        )
        db.add(new_refresh_entry)
        await db.commit()

        token_response = TokenResponse(
            access_token=access_token,
            refresh_token=new_raw_refresh,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            role=user.role.value,
            user_id=user.id,
            name=user.name,
            department_id=user.department_id
        )

        return token_response, new_raw_refresh

    @staticmethod
    async def logout(db: AsyncSession, raw_refresh_token: Optional[str]) -> None:
        """Revoke a specific refresh token upon logout."""
        if not raw_refresh_token:
            return
        token_hash_val = hash_token(raw_refresh_token)
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.token_hash == token_hash_val)
            .values(revoked=True)
        )
        await db.commit()
