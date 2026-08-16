from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from core.models.users import UserRole, UserStatus


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, examples=["Jane Doe"])
    email: EmailStr = Field(..., examples=["jane@example.com"])
    phone: Optional[str] = Field(None, min_length=8, max_length=20, examples=["+1234567890"])
    password: str = Field(..., min_length=6, max_length=100, examples=["SecretPass123!"])
    address: Optional[str] = Field(None, examples=["123 Main St"])
    area: Optional[str] = Field(None, examples=["Downtown"])
    city: Optional[str] = Field(None, examples=["Metropolis"])
    state: Optional[str] = Field(None, examples=["NY"])
    postal_code: Optional[str] = Field(None, examples=["10001"])
    latitude: Optional[float] = Field(None, examples=[40.7128])
    longitude: Optional[float] = Field(None, examples=[-74.0060])


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
class OfficerRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, examples=["Officer Raj"])
    email: EmailStr = Field(..., examples=["officer@city.gov.in"])
    phone: Optional[str] = Field(None, min_length=8, max_length=20, examples=["+91 9876543210"])
    password: str = Field(..., min_length=6, max_length=100, examples=["SecretPass123!"])
    department: Optional[str] = Field(None, examples=["Water & Sewerage"])
    department_id: Optional[int] = Field(None, examples=[1])
    region: Optional[str] = Field(None, examples=["Central"])
    employee_id: Optional[str] = Field(None, examples=["GOV-2026-8841"])
    designation: Optional[str] = Field(None, examples=["Field Inspector"])


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    phone: Optional[str] = None
    role: UserRole
    department_id: Optional[int] = None
    credibility_score: float
    status: UserStatus
    designation: Optional[str] = None
    employee_id: Optional[str] = None
    rejection_reason: Optional[str] = None
    address: Optional[str] = None
    area: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    created_at: datetime


class MeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    phone: Optional[str] = None
    role: UserRole
    department_id: Optional[int] = None
    credibility_score: float
    status: UserStatus
    designation: Optional[str] = None
    employee_id: Optional[str] = None
    rejection_reason: Optional[str] = None
    is_blocked: bool
    blocked_until: Optional[datetime] = None
    block_reason: Optional[str] = None
    duration_tier: Optional[str] = None
    address: Optional[str] = None
    area: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    created_at: datetime
