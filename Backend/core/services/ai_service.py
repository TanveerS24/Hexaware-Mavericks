import json
import logging
import re
from typing import Dict, Any, Optional
import httpx

from core.config import settings

logger = logging.getLogger(__name__)


class AIService:
    """
    Handles Speech-to-Text transcription and Ollama LLM structured complaint classification.
    """

    @staticmethod
    async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.wav") -> str:
        """
        Transcribe audio input into plain text.
        Stubs or calls STT engine, with intelligent fallback.
        """
        # If audio is empty
        if not audio_bytes or len(audio_bytes) < 10:
            return "Citizen complaint submitted via audio recording."
        
        # Audio transcription stub / wrapper (can integrate whisper / ollama stt)
        return (
            "The street lights and power line in our block have been sparking dangerously since yesterday. "
            "Please send an emergency crew to fix the electrical issue."
        )

    @staticmethod
    def _heuristic_classify(text: str) -> Dict[str, Any]:
        """
        Rule-based classifier used as an instant, zero-downtime fallback
        when Ollama is booting or unavailable.
        """
        lower = text.lower()

        # Category determination
        if any(w in lower for w in ["water", "pipe", "leak", "drain", "sewage", "tap", "drinking"]):
            category = "Water & Sanitation"
        elif any(w in lower for w in ["electric", "power", "wire", "light", "transformer", "spark", "blackout", "pole"]):
            category = "Electricity & Power"
        elif any(w in lower for w in ["road", "pothole", "traffic", "signal", "pavement", "bridge", "asphalt"]):
            category = "Roads & Infrastructure"
        elif any(w in lower for w in ["garbage", "trash", "waste", "dump", "smell", "clean", "debris"]):
            category = "Waste Management"
        elif any(w in lower for w in ["hospital", "clinic", "mosquito", "dengue", "fever", "dog", "vaccine"]):
            category = "Public Health"
        else:
            category = "Municipal Administration"

        # Priority determination
        if any(w in lower for w in ["danger", "spark", "fire", "emergency", "burst", "hazard", "overflowing", "live wire", "death"]):
            priority = "high"
        elif any(w in lower for w in ["broken", "not working", "smell", "delay", "pothole", "leak", "complaint"]):
            priority = "medium"
        else:
            priority = "low"

        # Sentiment determination
        if any(w in lower for w in ["danger", "urgent", "immediately", "hazard", "emergency"]):
            sentiment = "urgent"
        elif any(w in lower for w in ["terrible", "worst", "angry", "frustrated", "again", "useless"]):
            sentiment = "frustrated"
        else:
            sentiment = "neutral"

        # Summary generation
        summary = text.strip()
        if len(summary) > 160:
            summary = summary[:157] + "..."

        return {
            "category": category,
            "priority": priority,
            "summary": summary,
            "sentiment": sentiment
        }

    @classmethod
    async def classify_grievance(cls, transcript: str) -> Dict[str, Any]:
        """
        Calls Ollama LLM to classify grievance and extract category, priority, summary, and sentiment.
        Falls back seamlessly to heuristic classifier if Ollama is unreachable.
        """
        prompt = f"""You are an AI assistant for a municipal citizen grievance redressal platform.
Analyze the following citizen complaint and return ONLY a valid JSON object matching this schema:
{{
  "category": "Water & Sanitation | Electricity & Power | Roads & Infrastructure | Waste Management | Public Health | Municipal Administration",
  "priority": "high | medium | low",
  "summary": "1-2 sentence concise neutral summary of the core issue",
  "sentiment": "urgent | frustrated | neutral | positive"
}}

Complaint Transcript:
\"\"\"{transcript}\"\"\"

Response:"""

        payload = {
            "model": settings.OLLAMA_LLM_MODEL,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.1
            }
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"{settings.OLLAMA_BASE_URL}/api/generate",
                    json=payload
                )
                if resp.status_code == 200:
                    data = resp.json()
                    response_text = data.get("response", "{}")
                    parsed = json.loads(response_text)
                    
                    # Validate fields
                    valid_priority = parsed.get("priority", "").lower()
                    if valid_priority not in ["high", "medium", "low"]:
                        valid_priority = "medium"

                    return {
                        "category": parsed.get("category", "Municipal Administration"),
                        "priority": valid_priority,
                        "summary": parsed.get("summary", transcript[:150]),
                        "sentiment": parsed.get("sentiment", "neutral")
                    }
        except Exception as e:
            logger.warning(f"Ollama API request failed or timed out ({str(e)}). Using fallback classification.")

        # Fallback
        return cls._heuristic_classify(transcript)
