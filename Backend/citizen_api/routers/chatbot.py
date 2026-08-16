from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.db.session import get_db
from core.models.users import User
from core.schemas.knowledge_base import ChatbotQueryRequest, ChatbotResponse
from core.security import get_current_user
from core.services.issue_service import IssueService
from core.services.ai_service import AIService
from core.exceptions import ForbiddenError

router = APIRouter(prefix="/chatbot", tags=["AI Copilot Chatbot"])


@router.post("", response_model=ChatbotResponse)
async def query_chatbot(
    data: ChatbotQueryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    AI Assistant & Grievance Copilot.
    Answers questions strictly based on the citizen's own complaints.
    """
    if not current_user:
        raise ForbiddenError("You must be logged in to use the chatbot.")

    # 1. Fetch user's complaints
    issues, _ = await IssueService.get_queue(
        db=db,
        limit=100  # Reasonable limit to fit in context window
    )
    
    # Filter to only this user's issues (get_queue is admin/officer focused, so we filter)
    user_issues = [issue for issue in issues if issue.citizen_id == current_user.id]

    # 2. Format context
    context_lines = []
    for issue in user_issues:
        dept_name = issue.department.name if issue.department else "Unassigned"
        history_str = ", ".join([f"{h.changed_at.strftime('%Y-%m-%d %H:%M')}: {h.notes}" for h in issue.status_history])
        context_lines.append(
            f"Complaint ID: {issue.issue_id}\n"
            f"Category: {issue.category}\n"
            f"Status: {issue.status.value}\n"
            f"Department: {dept_name}\n"
            f"Summary: {issue.ai_summary}\n"
            f"Created At: {issue.created_at.strftime('%Y-%m-%d %H:%M')}\n"
            f"Updates: {history_str}\n"
        )
    
    context_data = "\n---\n".join(context_lines)
    if not context_data:
        context_data = "You currently have no active or past complaints."

    # 3. Query Gemini
    ai_result = await AIService.query_citizen_chatbot(context_data, data.message)

    return ChatbotResponse(
        reply=ai_result.get("reply", "I am unable to process your request."),
        suggested_category=None,
        suggested_department_id=None,
        relevant_articles=[],
        can_auto_file=ai_result.get("can_auto_file", False),
        extracted_issue_draft=ai_result.get("extracted_issue_draft", None)
    )
