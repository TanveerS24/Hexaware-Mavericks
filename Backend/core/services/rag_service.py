import logging
from typing import List, Optional, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.models.issues import Issue, IssueStatus
from core.models.knowledge_base import KnowledgeBase
from core.models.departments import Department

logger = logging.getLogger(__name__)


class RAGService:
    """
    Knowledge base search and basic duplicate detection.
    Uses keyword/text overlap — no external embedding APIs required.
    """

    @classmethod
    async def check_duplicate_issue(
        cls,
        db: AsyncSession,
        transcript: str,
        ward: Optional[str] = None,
        threshold: float = 0.5
    ) -> Dict[str, Any]:
        """
        Lightweight keyword-based duplicate detection.
        Compares the new transcript against recent open issues in the same ward.
        Returns a similarity score based on token overlap.
        """
        query = (
            select(Issue)
            .where(
                Issue.status.in_([
                    IssueStatus.NEW,
                    IssueStatus.REVIEWED,
                    IssueStatus.FORWARDED,
                    IssueStatus.IN_PROGRESS
                ])
            )
        )
        if ward:
            query = query.where(Issue.ward == ward)

        result = await db.execute(query)
        candidates = result.scalars().all()

        if not candidates:
            return {
                "is_duplicate": False,
                "similarity_score": 0.0,
                "existing_issue_id": None,
                "existing_summary": None,
            }

        # Keyword overlap scoring
        new_tokens = set(transcript.lower().split())
        best_similarity = 0.0
        best_issue = None

        for issue in candidates:
            existing_tokens = set(issue.transcript.lower().split())
            if not new_tokens or not existing_tokens:
                continue
            intersection = len(new_tokens & existing_tokens)
            union = len(new_tokens | existing_tokens)
            jaccard = intersection / union if union > 0 else 0.0
            if jaccard > best_similarity:
                best_similarity = jaccard
                best_issue = issue

        is_dup = best_similarity >= threshold
        return {
            "is_duplicate": is_dup,
            "similarity_score": round(best_similarity, 4),
            "existing_issue_id": best_issue.issue_id if (is_dup and best_issue) else None,
            "existing_summary": best_issue.ai_summary if (is_dup and best_issue) else None,
        }

    @classmethod
    async def query_knowledge_base(
        cls,
        db: AsyncSession,
        user_message: str,
        department_id: Optional[int] = None,
        top_k: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Searches knowledge base articles using keyword text overlap.
        """
        stmt = select(KnowledgeBase, Department).outerjoin(
            Department, KnowledgeBase.department_id == Department.id
        )
        if department_id:
            stmt = stmt.where(KnowledgeBase.department_id == department_id)

        result = await db.execute(stmt)
        entries = result.all()

        query_words = set(user_message.lower().split())

        scored = []
        for kb, dept in entries:
            content_words = set(kb.content.lower().split()) | set(kb.title.lower().split())
            if query_words and content_words:
                overlap = len(query_words & content_words)
                sim = min(0.95, overlap * 0.1)
            else:
                sim = 0.0

            scored.append({
                "id": kb.id,
                "title": kb.title,
                "content": kb.content,
                "department_name": dept.name if dept else "General",
                "similarity": sim
            })

        scored.sort(key=lambda x: x["similarity"], reverse=True)
        return scored[:top_k]
