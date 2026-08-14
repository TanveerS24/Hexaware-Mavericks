from typing import Optional, List
from pydantic import BaseModel, Field


class DepartmentCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    jurisdiction_area: Optional[str] = Field(None, max_length=255)


class DepartmentResponse(BaseModel):
    id: int
    name: str
    jurisdiction_area: Optional[str] = None

    class Config:
        from_attributes = True


class DepartmentListResponse(BaseModel):
    total: int
    items: List[DepartmentResponse]
