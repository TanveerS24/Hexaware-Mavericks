from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class KnowledgeBaseCreateRequest(BaseModel):
    department_id: Optional[int] = Field(None, description="Associated department ID")
    title: str = Field(..., min_length=3, max_length=255)
    content: str = Field(..., min_length=10)


class KnowledgeBaseResponse(BaseModel):
    id: int
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    title: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class KnowledgeBaseListResponse(BaseModel):
    total: int
    items: List[KnowledgeBaseResponse]


class ChatbotQueryRequest(BaseModel):
    message: str = Field(..., min_length=2, description="Citizen inquiry or grievance draft")
    department_id: Optional[int] = None


class ChatbotResponse(BaseModel):
    reply: str
    suggested_category: Optional[str] = None
    suggested_department_id: Optional[int] = None
    relevant_articles: List[str] = []
    can_auto_file: bool = False
    extracted_issue_draft: Optional[dict] = None


class FAQResponse(BaseModel):
    id: int
    title: str
    content: str
    department_name: Optional[str] = None
