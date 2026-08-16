import json
import logging
import re
import httpx
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.db.session import get_db
from core.models.users import User
from core.schemas.knowledge_base import ChatbotQueryRequest, ChatbotResponse
from core.security import get_current_user
from core.services.rag_service import RAGService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chatbot", tags=["AI Copilot Chatbot"])


async def _get_claude_chatbot_response(message: str, kb_context: str) -> str:
    """
    Calls Claude API to generate a helpful chatbot reply for citizen queries.
    Falls back to a simple rule-based response if the API is unavailable.
    """
    if not settings.AI_API_KEY:
        return (
            f"Thank you for your message: '{message}'. "
            "Our AI assistant is currently offline. Please file a grievance directly using the issues form "
            "or contact the municipal helpline for assistance."
        )

    system_prompt = (
        "You are a friendly and helpful AI assistant for a municipal citizen grievance platform. "
        "Help citizens understand municipal services, guide them to file grievances correctly, "
        "and answer questions about city services. Be concise (2-4 sentences), empathetic, and actionable. "
        "If you have relevant knowledge base context, use it. "
        "Do not invent services or contact details that are not in the provided context."
    )

    user_content = message
    if kb_context:
        user_content = (
            f"Relevant municipal knowledge base context:\n{kb_context}\n\n"
            f"Citizen question: {message}"
        )

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            base_url = (settings.AI_BASE_URL or "https://api.anthropic.com/v1").rstrip("/")
            resp = await client.post(
                f"{base_url}/messages",
                headers={
                    "x-api-key": settings.AI_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": settings.AI_MODEL if "claude" in settings.AI_MODEL.lower() else "claude-3-5-haiku-20241022",
                    "max_tokens": 512,
                    "system": system_prompt,
                    "messages": [{"role": "user", "content": user_content}],
                    "temperature": 0.3
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                content_blocks = data.get("content", [])
                if content_blocks and content_blocks[0].get("type") == "text":
                    return content_blocks[0].get("text", "").strip()
            else:
                logger.warning(f"Claude chatbot API returned {resp.status_code}: {resp.text}")
    except Exception as e:
        logger.warning(f"Claude chatbot API error: {e}")

    # Fallback
    return (
        f"Thank you for your message regarding: '{message}'. "
        "I can help you file this as an official grievance. "
        "Please use the 'Submit Grievance' form and our team will respond within 24-72 hours."
    )


@router.post("", response_model=ChatbotResponse)
async def query_chatbot(
    data: ChatbotQueryRequest,
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    AI Grievance Copilot powered by Claude.
    Searches the municipal knowledge base and provides intelligent citizen support.
    """
    # 1. Search knowledge base for context (keyword-based, no embeddings)
    kb_results = await RAGService.query_knowledge_base(
        db=db,
        user_message=data.message,
        department_id=data.department_id,
        top_k=3
    )

    # 2. Build KB context for Claude
    relevant_articles = [kb for kb in kb_results if kb["similarity"] > 0.1]
    kb_context = "\n".join(
        [f"- {kb['title']}: {kb['content'][:200]}" for kb in relevant_articles]
    ) if relevant_articles else ""

    # 3. Get Claude response
    reply = await _get_claude_chatbot_response(data.message, kb_context)

    # 4. Simple category guess from message keywords
    lower = data.message.lower()
    if any(w in lower for w in ["water", "pipe", "leak", "drain", "sewage"]):
        suggested_category = "Water & Sanitation"
    elif any(w in lower for w in ["electric", "power", "wire", "light", "spark"]):
        suggested_category = "Electricity & Power"
    elif any(w in lower for w in ["road", "pothole", "traffic", "signal", "pavement"]):
        suggested_category = "Roads & Infrastructure"
    elif any(w in lower for w in ["garbage", "trash", "waste", "dump", "smell"]):
        suggested_category = "Waste Management"
    elif any(w in lower for w in ["hospital", "clinic", "mosquito", "fever", "health"]):
        suggested_category = "Public Health"
    else:
        suggested_category = "Municipal Administration"

    return ChatbotResponse(
        reply=reply,
        suggested_category=suggested_category,
        suggested_department_id=None,
        relevant_articles=[kb["title"] for kb in relevant_articles],
        can_auto_file=True,
        extracted_issue_draft={
            "transcript": data.message,
            "category": suggested_category,
        }
    )
