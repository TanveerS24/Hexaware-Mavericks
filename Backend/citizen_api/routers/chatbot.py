import logging
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.db.session import get_db
from core.models.users import User
from core.models.issues import Issue
from core.schemas.knowledge_base import ChatbotQueryRequest, ChatbotResponse
from core.security import get_optional_current_user
from core.services.ai_service import AIService
from core.services.rag_service import RAGService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chatbot", tags=["AI Copilot Chatbot"])


@router.post("", response_model=ChatbotResponse)
async def query_chatbot(
    data: ChatbotQueryRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    AI Assistant & Grievance Copilot.
    Handles inquiries, tracks citizen's complaints, drafts new grievances,
    and searches knowledge base articles.
    """
    context_lines = []
    user_issues = []

    # 1. Fetch citizen's complaints if authenticated
    if current_user and getattr(current_user, "id", None):
        try:
            stmt = (
                select(Issue)
                .options(
                    selectinload(Issue.department),
                    selectinload(Issue.status_history)
                )
                .where(Issue.citizen_id == current_user.id)
                .order_by(Issue.created_at.desc())
                .limit(20)
            )
            result = await db.execute(stmt)
            user_issues = list(result.scalars().all())
        except Exception as e:
            logger.warning(f"Failed to fetch user issues for chatbot: {e}")

        for issue in user_issues:
            dept_name = issue.department.name if issue.department else "Unassigned"
            history_str = ", ".join([
                f"{h.changed_at.strftime('%Y-%m-%d %H:%M')}: {h.notes}"
                for h in (issue.status_history or [])
                if getattr(h, "changed_at", None)
            ])
            status_val = issue.status.value if hasattr(issue.status, "value") else str(issue.status)
            created_str = issue.created_at.strftime('%Y-%m-%d %H:%M') if issue.created_at else 'Recent'
            context_lines.append(
                f"Complaint ID: {issue.issue_id}\n"
                f"Category: {issue.category}\n"
                f"Status: {status_val}\n"
                f"Department: {dept_name}\n"
                f"Summary: {issue.ai_summary or issue.transcript}\n"
                f"Created At: {created_str}\n"
                f"Updates: {history_str or 'Under initial review'}\n"
            )

    context_data = "\n---\n".join(context_lines)
    if not context_data:
        if current_user:
            context_data = "You currently have no active or past complaints registered in your account."
        else:
            context_data = "Citizen is browsing anonymously (not logged in)."

    # 2. Match Knowledge Base / FAQs
    relevant_articles = []
    try:
        kb_matches = await RAGService.query_knowledge_base(db, data.message, top_k=2)
        for kb in kb_matches:
            if kb.get("similarity", 0) > 0.05:
                relevant_articles.append(f"{kb['title']}: {kb['content']}")
    except Exception as e:
        logger.debug(f"KB lookup error: {e}")

    if relevant_articles:
        context_data += "\n\nMunicipal Guidelines & FAQs:\n" + "\n".join(relevant_articles)

    # 3. Query AI Service with Heuristic & LLM support
    ai_result = await AIService.query_citizen_chatbot(context_data, data.message)
    reply_text = ai_result.get("reply", "I am your AI Grievance Copilot. How may I assist you today?")

    return ChatbotResponse(
        reply=reply_text,
        response=reply_text,
        suggested_category=ai_result.get("suggested_category", None),
        suggested_department_id=ai_result.get("suggested_department_id", None),
        relevant_articles=relevant_articles,
        can_auto_file=ai_result.get("can_auto_file", False),
        extracted_issue_draft=ai_result.get("extracted_issue_draft", None)
    )

