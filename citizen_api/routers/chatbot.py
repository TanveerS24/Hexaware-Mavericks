from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.db.session import get_db
from core.models.users import User
from core.schemas.knowledge_base import ChatbotQueryRequest, ChatbotResponse
from core.security import get_current_user
from core.services.rag_service import RAGService
from core.services.ai_service import AIService

router = APIRouter(prefix="/chatbot", tags=["AI Copilot Chatbot"])


@router.post("", response_model=ChatbotResponse)
async def query_chatbot(
    data: ChatbotQueryRequest,
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    AI Assistant & Grievance Copilot.
    Searches the municipal knowledge base using vector similarity and provides instant answers
    or assists the citizen with categorizing and drafting a complaint.
    """
    # 1. Search knowledge base
    kb_results = await RAGService.query_knowledge_base(
        db=db,
        user_message=data.message,
        department_id=data.department_id,
        top_k=2
    )

    # 2. Extract classification hints
    classification = await AIService.classify_grievance(data.message)

    # 3. Format response
    matched_articles = [f"{kb['title']}: {kb['content'][:120]}..." for kb in kb_results if kb["similarity"] > 0.4]

    if matched_articles:
        reply = (
            f"Here is what I found in our municipal knowledge base:\n\n" +
            "\n".join([f"• {a}" for a in matched_articles]) +
            "\n\nWould you like me to file an official grievance ticket for you under "
            f"'{classification['category']}' with {classification['priority']} priority?"
        )
    else:
        reply = (
            f"I have reviewed your message regarding: '{data.message}'. "
            f"This appears to be related to '{classification['category']}'. "
            f"I can help you file this as an official grievance ticket right away."
        )

    return ChatbotResponse(
        reply=reply,
        suggested_category=classification["category"],
        suggested_department_id=None,
        relevant_articles=[kb["title"] for kb in kb_results if kb["similarity"] > 0.4],
        can_auto_file=True,
        extracted_issue_draft={
            "transcript": data.message,
            "category": classification["category"],
            "priority": classification["priority"],
            "summary": classification["summary"]
        }
    )
