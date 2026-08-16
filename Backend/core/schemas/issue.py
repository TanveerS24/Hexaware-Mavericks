from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field
from core.models.issues import IssuePriority, IssueStatus


class IssueCreateRequest(BaseModel):
    transcript: str = Field(..., min_length=5, description="Text description or transcribed audio")
    location_lat: Optional[float] = Field(None, ge=-90.0, le=90.0)
    location_lng: Optional[float] = Field(None, ge=-180.0, le=180.0)
    ward: Optional[str] = None
    audio_url: Optional[str] = None
    category: Optional[str] = None  # Optional override if client provides
    source: str = Field("manual", description="Source of the complaint")


class IssueForwardRequest(BaseModel):
    department_id: int = Field(..., description="Target department ID")
    notes: Optional[str] = Field(None, description="Forwarding notes or instructions")


class IssueResolveRequest(BaseModel):
    notes: str = Field(..., min_length=3, description="Resolution notes")


class IssueMarkMaliciousRequest(BaseModel):
    reason: str = Field(..., min_length=3, description="Reason why this grievance is deemed malicious/spam")


class IssueUpdateStatusRequest(BaseModel):
    status: IssueStatus = Field(..., description="New status (in_progress, resolved)")
    notes: Optional[str] = None
    version: Optional[int] = Field(None, description="Current issue version for optimistic locking")


class IssueClaimRequest(BaseModel):
    version: Optional[int] = Field(None, description="Current issue version for optimistic locking")


class IssueHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    old_status: Optional[str] = None
    new_status: str
    changed_by_user_id: Optional[int] = None
    changed_by_name: Optional[str] = None
    changed_at: datetime
    notes: Optional[str] = None


class DuplicateCheckResult(BaseModel):
    is_duplicate: bool
    similarity_score: float
    existing_issue_id: Optional[str] = None
    existing_summary: Optional[str] = None


class IssueResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    issue_id: str
    citizen_id: int
    citizen_name: Optional[str] = None
    citizen_phone: Optional[str] = None
    category: str
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    priority: IssuePriority
    status: IssueStatus
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    ward: Optional[str] = None
    source: str
    transcript: str
    audio_url: Optional[str] = None
    ai_summary: Optional[str] = None
    sentiment: Optional[str] = None
    assigned_officer_ids: List[int] = []
    version: int
    sla_due_at: Optional[datetime] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
    history: List[IssueHistoryResponse] = []
    duplicate_info: Optional[DuplicateCheckResult] = None


class IssueListResponse(BaseModel):
    total: int
    items: List[IssueResponse]
