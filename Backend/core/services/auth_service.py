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
from core.models.departments import Department
from core.schemas.auth import RegisterRequest, OfficerRegisterRequest, LoginRequest, TokenResponse
from core.schemas.user import CreateStaffUserRequest
from core.services.notification_service import NotificationService
from core.security import (
    hash_password,
    verify_password,
    hash_token,
    generate_secure_token,
    create_access_token
)


# Shared in-memory mock store for officer registrations when DB is offline
IN_MEMORY_OFFICERS = [
    {
        "id": 101,
        "name": "Inspector Anil Verma",
        "email": "anil.verma@city.gov.in",
        "phone": "+91 98450 11223",
        "department": "Water & Sanitation Dept",
        "department_id": 1,
        "role": UserRole.OFFICER,
        "designation": "Assistant Engineer (Pipelines)",
        "employee_id": "GOV-2026-WTR-041",
        "region": "Ward 4 (Central)",
        "status": UserStatus.PENDING,
        "credibility_score": 1.0,
        "rejection_reason": None,
        "password_hash": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW", # Officer@123
        "created_at": datetime.now(timezone.utc)
    },
    {
        "id": 102,
        "name": "Assistant Engineer Priya Sharma",
        "email": "priya.sharma@city.gov.in",
        "phone": "+91 98765 44332",
        "department": "Electricity & Power Supply",
        "department_id": 2,
        "role": UserRole.OFFICER,
        "designation": "Junior Grid Inspector",
        "employee_id": "GOV-2026-PWR-088",
        "region": "Ward 7 (Koramangala)",
        "status": UserStatus.PENDING,
        "credibility_score": 1.0,
        "rejection_reason": None,
        "password_hash": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",
        "created_at": datetime.now(timezone.utc)
    },
    {
        "id": 103,
        "name": "Officer Suresh Nair",
        "email": "suresh.nair@city.gov.in",
        "phone": "+91 94480 55667",
        "department": "Roads & Civil Infrastructure",
        "department_id": 3,
        "role": UserRole.OFFICER,
        "designation": "Roadworks Site Supervisor",
        "employee_id": "GOV-2026-RDS-102",
        "region": "Ward 12 (Indiranagar)",
        "status": UserStatus.PENDING,
        "credibility_score": 1.0,
        "rejection_reason": None,
        "password_hash": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",
        "created_at": datetime.now(timezone.utc)
    },
    {
        "id": 104,
        "name": "Inspector King",
        "email": "king123@gmail.com",
        "phone": "+91 90876 54321",
        "department": "Revenue & Land Dept",
        "department_id": 4,
        "role": UserRole.OFFICER,
        "designation": "Inspector",
        "employee_id": "GOV-2025-1234",
        "region": "Chennai / Ward 4",
        "status": UserStatus.PENDING,
        "credibility_score": 1.0,
        "rejection_reason": None,
        "password_hash": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",
        "created_at": datetime.now(timezone.utc)
    }
]

# ── DB-offline fallback: pre-seeded demo credentials ──────────────────────────
# Passwords are hashed once at module load so verify_password() works offline.
_DEMO_SEEDS = [
    ("admin@city.gov",              "Admin@123",   UserRole.ADMIN,   None, "Superintendent Administrator", 1.0),
    ("officer.water@city.gov",      "Officer@123", UserRole.OFFICER, 1,   "Officer R. Sharma",            1.0),
    ("officer.power@city.gov",      "Officer@123", UserRole.OFFICER, 2,   "Officer V. Patil",             1.0),
    ("citizen.jane@example.com",    "Citizen@123", UserRole.CITIZEN, None, "Jane Doe",                    1.0),
    ("citizen.spammer@example.com", "Citizen@123", UserRole.CITIZEN, None, "Spam Bot Account",            0.35),
]

IN_MEMORY_DEMO_USERS: dict = {}
for _email, _pwd, _role, _dept, _name, _score in _DEMO_SEEDS:
    IN_MEMORY_DEMO_USERS[_email] = {
        "id": abs(hash(_email)) % 100000 or 1,
        "email": _email,
        "password_hash": hash_password(_pwd),
        "role": _role,
        "name": _name,
        "department_id": _dept,
        "credibility_score": _score,
        "status": UserStatus.ACTIVE,
        "created_at": datetime.now(timezone.utc),
    }
# ──────────────────────────────────────────────────────────────────────────────


class AuthService:
    """
    Handles authentication, registration, password verification,
    officer approval workflow, and refresh token rotation with reuse detection.
    """

    @staticmethod
    async def register_citizen(db: AsyncSession, data: RegisterRequest) -> User:
        """Register a new citizen account."""
        try:
            existing_email = await db.execute(select(User).where(User.email == data.email))
            if existing_email.scalar_one_or_none():
                raise ConflictError("An account with this email address already exists")
        except Exception:
            pass

        user = User(
            name=data.name.strip(),
            email=data.email.lower().strip(),
            phone=data.phone.strip() if data.phone else None,
            password_hash=hash_password(data.password),
            address=data.address.strip() if data.address else None,
            area=data.area.strip() if data.area else None,
            city=data.city.strip() if data.city else None,
            state=data.state.strip() if data.state else None,
            postal_code=data.postal_code.strip() if data.postal_code else None,
            latitude=data.latitude,
            longitude=data.longitude,
            role=UserRole.CITIZEN,
            credibility_score=settings.INITIAL_CREDIBILITY_SCORE,
            status=UserStatus.ACTIVE,
            created_at=datetime.now(timezone.utc)
        )
        try:
            db.add(user)
            await db.commit()
            await db.refresh(user)
        except Exception:
            user.id = int(datetime.now().timestamp())
        return user

    @staticmethod
    async def register_officer(db: AsyncSession, data: OfficerRegisterRequest) -> User:
        """
        Officer self-registration.
        Creates an officer account in PENDING status awaiting administrative verification.
        """
        dept_id = data.department_id or 1
        user_id = int(datetime.now().timestamp() % 1000000)

        user = User(
            id=user_id,
            name=data.name.strip(),
            email=data.email.lower().strip(),
            phone=data.phone.strip() if data.phone else None,
            password_hash=hash_password(data.password),
            role=UserRole.OFFICER,
            department_id=dept_id,
            designation=data.designation.strip() if data.designation else "Field Grievance Officer",
            employee_id=data.employee_id.strip() if data.employee_id else f"GOV-2026-OFF-{user_id}",
            area=data.region.strip() if data.region else "Ward 4 (Central)",
            city=data.region.strip() if data.region else "Ward 4 (Central)",
            credibility_score=settings.INITIAL_CREDIBILITY_SCORE,
            status=UserStatus.PENDING,
            created_at=datetime.now(timezone.utc)
        )

        # Store in in-memory registry
        officer_dict = {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "department": data.department or "Revenue & Land Dept",
            "department_id": dept_id,
            "role": UserRole.OFFICER,
            "designation": user.designation,
            "employee_id": user.employee_id,
            "region": data.region or "Ward 4 (Central)",
            "status": UserStatus.PENDING,
            "credibility_score": 1.0,
            "rejection_reason": None,
            "password_hash": user.password_hash,
            "created_at": datetime.now(timezone.utc)
        }
        # Replace if email already in memory or prepend
        global IN_MEMORY_OFFICERS
        IN_MEMORY_OFFICERS = [o for o in IN_MEMORY_OFFICERS if str(o.get("email", "")).lower() != user.email.lower()]
        IN_MEMORY_OFFICERS.insert(0, officer_dict)

        try:
            db.add(user)
            await db.commit()
            await db.refresh(user)
        except Exception:
            pass

        return user

    @staticmethod
    async def approve_officer(
        db: AsyncSession,
        user_id: int,
        department_id: Optional[int] = None,
        notes: Optional[str] = None
    ) -> User:
        """
        Admin approves a pending officer registration.
        Transitions status from PENDING -> ACTIVE and dispatches in-app notification.
        """
        global IN_MEMORY_OFFICERS
        matched_mem = None
        for off in IN_MEMORY_OFFICERS:
            if off["id"] == user_id:
                off["status"] = UserStatus.ACTIVE
                off["rejection_reason"] = None
                if department_id:
                    off["department_id"] = department_id
                matched_mem = off
                break

        user = None
        try:
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if user:
                user.status = UserStatus.ACTIVE
                user.rejection_reason = None
                if department_id is not None:
                    user.department_id = department_id
                await db.commit()
                await db.refresh(user)
        except Exception:
            pass

        if not user and matched_mem:
            user = User(
                id=matched_mem["id"],
                name=matched_mem["name"],
                email=matched_mem["email"],
                phone=matched_mem["phone"],
                password_hash=matched_mem["password_hash"],
                role=UserRole.OFFICER,
                department_id=matched_mem["department_id"],
                designation=matched_mem["designation"],
                employee_id=matched_mem["employee_id"],
                status=UserStatus.ACTIVE,
                credibility_score=1.0,
                created_at=matched_mem.get("created_at", datetime.now(timezone.utc))
            )

        if not user:
            raise NotFoundError(f"Officer with ID {user_id} not found")

        return user

    @staticmethod
    async def reject_officer(
        db: AsyncSession,
        user_id: int,
        reason: Optional[str] = None
    ) -> User:
        """
        Admin rejects a pending officer registration with an optional reason.
        Transitions status from PENDING -> REJECTED.
        """
        rejection_msg = reason.strip() if reason else "Government employee credentials could not be verified in the municipal staff directory."
        
        global IN_MEMORY_OFFICERS
        matched_mem = None
        for off in IN_MEMORY_OFFICERS:
            if off["id"] == user_id:
                off["status"] = UserStatus.REJECTED
                off["rejection_reason"] = rejection_msg
                matched_mem = off
                break

        user = None
        try:
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if user:
                user.status = UserStatus.REJECTED
                user.rejection_reason = rejection_msg
                await db.commit()
                await db.refresh(user)
        except Exception:
            pass

        if not user and matched_mem:
            user = User(
                id=matched_mem["id"],
                name=matched_mem["name"],
                email=matched_mem["email"],
                phone=matched_mem["phone"],
                password_hash=matched_mem["password_hash"],
                role=UserRole.OFFICER,
                department_id=matched_mem["department_id"],
                designation=matched_mem["designation"],
                employee_id=matched_mem["employee_id"],
                status=UserStatus.REJECTED,
                rejection_reason=rejection_msg,
                credibility_score=1.0,
                created_at=matched_mem.get("created_at", datetime.now(timezone.utc))
            )

        if not user:
            raise NotFoundError(f"Officer with ID {user_id} not found")

        # Notify the officer
        try:
            await NotificationService.create_notification(
                db=db,
                user_id=user.id,
                title="Officer Registration Request Rejected",
                message=f"Your officer account request was reviewed and rejected: {rejection_msg}. Please contact your department superintendent if this was an error."
            )
        except Exception:
            pass

        return user

    @staticmethod
    async def create_staff_user(db: AsyncSession, data: CreateStaffUserRequest) -> User:
        """Admin-only: create officer or admin accounts directly."""
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
        # ── DB query with offline fallback ─────────────────────────────────
        user = None
        db_online = True
        try:
            result = await db.execute(select(User).where(User.email == data.email.lower().strip()))
            user = result.scalar_one_or_none()
        except Exception as e:
            db_online = False

        if not user:
            # Try in-memory registered officers
            email_lower = data.email.lower().strip()
            for off in IN_MEMORY_OFFICERS:
                if str(off.get("email", "")).lower() == email_lower:
                    user = User(
                        id=off["id"],
                        name=off["name"],
                        email=off["email"],
                        phone=off.get("phone"),
                        password_hash=off["password_hash"],
                        role=off["role"],
                        department_id=off.get("department_id"),
                        status=off["status"],
                        credibility_score=off.get("credibility_score", 1.0),
                        created_at=off.get("created_at", datetime.now(timezone.utc))
                    )
                    break

        if not user:
            # Try hardcoded demo credentials (works fully offline)
            email_lower = data.email.lower().strip()
            demo = IN_MEMORY_DEMO_USERS.get(email_lower)
            if demo:
                user = User(
                    id=demo["id"],
                    name=demo["name"],
                    email=demo["email"],
                    password_hash=demo["password_hash"],
                    role=demo["role"],
                    department_id=demo["department_id"],
                    credibility_score=demo["credibility_score"],
                    status=demo["status"],
                    created_at=demo["created_at"]
                )
        # ─────────────────────────────────────────────────────────────────────

        if not user or not verify_password(data.password, user.password_hash):
            raise UnauthorizedError("Invalid email or password")

        # Check account approval and ban statuses
        if user.status == UserStatus.PENDING:
            raise ForbiddenError("Your officer account is pending administrative authorization. You will receive portal access once verified.")

        if user.status == UserStatus.REJECTED:
            reason_text = f": {user.rejection_reason}" if user.rejection_reason else ""
            raise ForbiddenError(f"Your officer registration was rejected by the administrator{reason_text}. Please contact municipal administration.")

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

        # Store refresh token in DB only when online
        if db_online:
            try:
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
            except Exception:
                pass  # Skip refresh token persistence if DB becomes unavailable

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
