import hashlib
import logging
from typing import List, Optional, Tuple, Dict, Any
import httpx
import numpy as np
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.models.issues import Issue, IssueStatus
from core.models.issue_embeddings import IssueEmbedding
from core.models.knowledge_base import KnowledgeBase
from core.models.departments import Department

logger = logging.getLogger(__name__)


def generate_fallback_embedding(text: str, dim: int = 768) -> List[float]:
    """
    Generates a deterministic, normalized float vector embedding for testing/offline scenarios.
    """
    vec = np.zeros(dim, dtype=np.float32)
    tokens = text.lower().split()
    for i, token in enumerate(tokens):
        # Hash token
        h = int(hashlib.md5(token.encode("utf-8")).hexdigest(), 16)
        idx = h % dim
        vec[idx] += 1.0 + (i * 0.05)
    
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    else:
        vec[0] = 1.0
    return vec.tolist()


class RAGService:
    """
    Manages vector embeddings, pgvector duplicate detection,
    and RAG chatbot knowledge base search.
    """

    @staticmethod
    async def get_embedding(text: str) -> List[float]:
        """
        Retrieves vector embedding from Cloud AI API (Gemini / OpenAI-compatible)
        or falls back to local deterministic embedding.
        """
        if not settings.AI_API_KEY:
            return generate_fallback_embedding(text, settings.EMBEDDING_DIMENSION)

        # Anthropic Claude does not provide native embeddings API; use fallback deterministic embeddings
        if (settings.AI_PROVIDER in ["claude", "anthropic"] or "claude" in settings.AI_MODEL.lower()) and not settings.AI_BASE_URL:
            return generate_fallback_embedding(text, settings.EMBEDDING_DIMENSION)

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                # 1. Google Gemini Embeddings API
                if settings.AI_PROVIDER == "gemini" or ("gemini" in settings.AI_MODEL.lower() and "text-embedding" in settings.AI_EMBEDDING_MODEL.lower()):
                    base_url = settings.AI_BASE_URL or "https://generativelanguage.googleapis.com/v1beta"
                    model_name = settings.AI_EMBEDDING_MODEL if "models/" in settings.AI_EMBEDDING_MODEL else f"models/{settings.AI_EMBEDDING_MODEL}"
                    url = f"{base_url}/{model_name}:embedContent?key={settings.AI_API_KEY}"
                    payload = {
                        "content": {"parts": [{"text": text[:2000]}]}
                    }
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        values = data.get("embedding", {}).get("values", [])
                        if values and isinstance(values, list):
                            if len(values) == settings.EMBEDDING_DIMENSION:
                                return [float(x) for x in values]
                            elif len(values) > settings.EMBEDDING_DIMENSION:
                                return [float(x) for x in values[:settings.EMBEDDING_DIMENSION]]
                            else:
                                pad = [0.0] * (settings.EMBEDDING_DIMENSION - len(values))
                                return [float(x) for x in values] + pad

                # 2. OpenAI or OpenAI-compatible Embeddings API
                else:
                    base_url = (settings.AI_BASE_URL or "https://api.openai.com/v1").rstrip("/")
                    url = f"{base_url}/embeddings"
                    headers = {
                        "Authorization": f"Bearer {settings.AI_API_KEY}",
                        "Content-Type": "application/json"
                    }
                    payload = {
                        "model": settings.AI_EMBEDDING_MODEL,
                        "input": text[:2000]
                    }
                    resp = await client.post(url, headers=headers, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        values = data.get("data", [{}])[0].get("embedding", [])
                        if values and isinstance(values, list):
                            if len(values) == settings.EMBEDDING_DIMENSION:
                                return [float(x) for x in values]
                            elif len(values) > settings.EMBEDDING_DIMENSION:
                                return [float(x) for x in values[:settings.EMBEDDING_DIMENSION]]
                            else:
                                pad = [0.0] * (settings.EMBEDDING_DIMENSION - len(values))
                                return [float(x) for x in values] + pad
        except Exception as e:
            logger.debug(f"Cloud AI embedding API unavailable ({str(e)}). Using deterministic fallback.")

        return generate_fallback_embedding(text, settings.EMBEDDING_DIMENSION)

    @classmethod
    async def check_duplicate_issue(
        cls,
        db: AsyncSession,
        transcript: str,
        ward: Optional[str] = None,
        threshold: float = settings.DUPLICATE_SIMILARITY_THRESHOLD
    ) -> Dict[str, Any]:
        """
        Compares issue embedding against recent open grievances in the same ward.
        Uses pgvector cosine distance to detect duplicate filings.
        """
        query_vector = await cls.get_embedding(transcript)
        
        # Build query for recent open issues
        query = (
            select(IssueEmbedding, Issue)
            .join(Issue, IssueEmbedding.issue_id == Issue.id)
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
        candidates = result.all()

        if not candidates:
            return {
                "is_duplicate": False,
                "similarity_score": 0.0,
                "existing_issue_id": None,
                "existing_summary": None,
                "embedding": query_vector
            }

        best_similarity = 0.0
        best_issue = None
        q_vec = np.array(query_vector, dtype=np.float32)
        q_norm = np.linalg.norm(q_vec)

        for emb_entry, issue in candidates:
            if emb_entry.embedding is None:
                continue
            cand_vec = np.array(emb_entry.embedding, dtype=np.float32)
            c_norm = np.linalg.norm(cand_vec)
            if q_norm > 0 and c_norm > 0:
                sim = float(np.dot(q_vec, cand_vec) / (q_norm * c_norm))
                if sim > best_similarity:
                    best_similarity = sim
                    best_issue = issue

        is_dup = best_similarity >= threshold
        return {
            "is_duplicate": is_dup,
            "similarity_score": round(best_similarity, 4),
            "existing_issue_id": best_issue.issue_id if (is_dup and best_issue) else None,
            "existing_summary": best_issue.ai_summary if (is_dup and best_issue) else None,
            "embedding": query_vector
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
        Searches knowledge base for relevant FAQ articles using cosine similarity.
        """
        query_vec = await cls.get_embedding(user_message)
        q_vec = np.array(query_vec, dtype=np.float32)
        q_norm = np.linalg.norm(q_vec)

        stmt = select(KnowledgeBase, Department).outerjoin(
            Department, KnowledgeBase.department_id == Department.id
        )
        if department_id:
            stmt = stmt.where(KnowledgeBase.department_id == department_id)

        result = await db.execute(stmt)
        entries = result.all()

        scored = []
        for kb, dept in entries:
            sim = 0.0
            if kb.embedding is not None:
                cand_vec = np.array(kb.embedding, dtype=np.float32)
                c_norm = np.linalg.norm(cand_vec)
                if q_norm > 0 and c_norm > 0:
                    sim = float(np.dot(q_vec, cand_vec) / (q_norm * c_norm))
            else:
                # Text overlap score fallback
                overlap = sum(1 for word in user_message.lower().split() if word in kb.content.lower())
                sim = min(0.9, overlap * 0.1)

            scored.append({
                "id": kb.id,
                "title": kb.title,
                "content": kb.content,
                "department_name": dept.name if dept else "General",
                "similarity": sim
            })

        scored.sort(key=lambda x: x["similarity"], reverse=True)
        return scored[:top_k]
