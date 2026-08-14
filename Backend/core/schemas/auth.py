from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from core.models.users import UserRole, UserStatus


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, examples=["Jane Doe"])
    email: EmailStr = Field(..., examples=["jane@example.com"])
    phone: Optional[str] = Field(None, min_length=8, max_length=20, examples=["+1234567890"])
    password: str = Field(..., min_length=6, max_length=100, examples=["SecretPass123!"])


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., examples=["jane@example.com"])
    password: str = Field(..., examples=["SecretPass123!"])
    device_info: Optional[str] = Field(None, examples=["Chrome / Mac OS X"])


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: int  # in seconds
    role: str
    user_id: int
    name: str
    department_id: Optional[int] = None


class RefreshTokenRequest(BaseModel):
    refresh_token: Optional[str] = None
    device_info: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    role: UserRole
    department_id: Optional[int] = None
    credibility_score: float
    status: UserStatus
    created_at: datetime

    class Config:
        from_attributes = True


class MeResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    role: UserRole
    department_id: Optional[int] = None
    credibility_score: float
    status: UserStatus
    is_blocked: bool
    blocked_until: Optional[datetime] = None
    block_reason: Optional[str] = None
    duration_tier: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
