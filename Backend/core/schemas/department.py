from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


class DepartmentCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    jurisdiction_area: Optional[str] = Field(None, max_length=255)


class DepartmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    jurisdiction_area: Optional[str] = None


class DepartmentListResponse(BaseModel):
    total: int
    items: List[DepartmentResponse]
