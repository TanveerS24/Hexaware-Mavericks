from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from core.models.users import UserRole, UserStatus
from core.schemas.auth import UserResponse


class CreateStaffUserRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, min_length=8, max_length=20)
    password: str = Field(..., min_length=6, max_length=100)
    role: UserRole = Field(..., description="Role must be officer or admin")
    department_id: Optional[int] = Field(None, description="Department ID for field officer")


class OfficerApproveRequest(BaseModel):
    department_id: Optional[int] = Field(None, description="Assign or update department upon approval")
    notes: Optional[str] = Field(None, description="Approval notes")


class OfficerRejectRequest(BaseModel):
    reason: Optional[str] = Field(None, description="Reason for rejection to display to the applicant")


class UserListResponse(BaseModel):
    total: int
    items: List[UserResponse]

