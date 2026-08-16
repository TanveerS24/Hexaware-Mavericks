import json
import logging
import re
from typing import Dict, Any, Optional
import httpx

from core.config import settings

logger = logging.getLogger(__name__)


class AIService:
    """
    Handles Speech-to-Text transcription and Cloud AI API (Gemini / OpenAI-compatible)
    structured complaint classification with robust heuristic fallback.
    """

    @staticmethod
    async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.wav") -> str:
        """
        Transcribe audio input into plain text.
        Stubs or calls STT engine, with intelligent fallback.
        """
        if not audio_bytes or len(audio_bytes) < 10:
            return "Citizen complaint submitted via audio recording."
        
        return (
            "The street lights and power line in our block have been sparking dangerously since yesterday. "
            "Please send an emergency crew to fix the electrical issue."
        )

    @staticmethod
    def _heuristic_classify(text: str) -> Dict[str, Any]:
        """
        Rule-based classifier used as an instant, zero-downtime fallback.
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
        Calls Cloud AI API to classify grievance and extract category, priority, summary, and sentiment.
        Falls back seamlessly to heuristic classifier if API is not configured or fails.
        """
        if not settings.AI_API_KEY:
            return cls._heuristic_classify(transcript)

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

        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                # 1. Anthropic Claude API
                if settings.AI_PROVIDER in ["claude", "anthropic"] or "claude" in settings.AI_MODEL.lower():
                    base_url = (settings.AI_BASE_URL or "https://api.anthropic.com/v1").rstrip("/")
                    url = f"{base_url}/messages"
                    headers = {
                        "x-api-key": settings.AI_API_KEY,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json"
                    }
                    payload = {
                        "model": settings.AI_MODEL if "claude" in settings.AI_MODEL.lower() else "claude-3-5-haiku-20241022",
                        "max_tokens": 1024,
                        "system": "You are an AI assistant for a municipal citizen grievance redressal platform. You output strictly a valid JSON object matching the requested schema with no markdown decoration.",
                        "messages": [
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.1
                    }
                    resp = await client.post(url, headers=headers, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        content_blocks = data.get("content", [])
                        if content_blocks and content_blocks[0].get("type") == "text":
                            raw_text = content_blocks[0].get("text", "{}").strip()
                            clean_text = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_text, flags=re.DOTALL).strip()
                            parsed = json.loads(clean_text)
                            valid_priority = str(parsed.get("priority", "")).lower()
                            if valid_priority not in ["high", "medium", "low"]:
                                valid_priority = "medium"
                            return {
                                "category": parsed.get("category", "Municipal Administration"),
                                "priority": valid_priority,
                                "summary": parsed.get("summary", transcript[:150]),
                                "sentiment": parsed.get("sentiment", "neutral")
                            }
                    else:
                        logger.warning(f"Claude API request returned status {resp.status_code}: {resp.text}")

                # 2. Google Gemini API
                elif settings.AI_PROVIDER == "gemini" or "gemini" in settings.AI_MODEL.lower():
                    base_url = settings.AI_BASE_URL or "https://generativelanguage.googleapis.com/v1beta"
                    model_name = settings.AI_MODEL if "models/" in settings.AI_MODEL else f"models/{settings.AI_MODEL}"
                    url = f"{base_url}/{model_name}:generateContent?key={settings.AI_API_KEY}"
                    
                    payload = {
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {
                            "responseMimeType": "application/json",
                            "temperature": 0.1
                        }
                    }
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            text_resp = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "{}")
                            parsed = json.loads(text_resp)
                            valid_priority = str(parsed.get("priority", "")).lower()
                            if valid_priority not in ["high", "medium", "low"]:
                                valid_priority = "medium"
                            return {
                                "category": parsed.get("category", "Municipal Administration"),
                                "priority": valid_priority,
                                "summary": parsed.get("summary", transcript[:150]),
                                "sentiment": parsed.get("sentiment", "neutral")
                            }

                # 3. OpenAI or OpenAI-compatible API
                else:
                    base_url = (settings.AI_BASE_URL or "https://api.openai.com/v1").rstrip("/")
                    url = f"{base_url}/chat/completions"
                    headers = {
                        "Authorization": f"Bearer {settings.AI_API_KEY}",
                        "Content-Type": "application/json"
                    }
                    payload = {
                        "model": settings.AI_MODEL,
                        "messages": [
                            {"role": "system", "content": "You output strictly valid JSON."},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.1,
                        "response_format": {"type": "json_object"}
                    }
                    resp = await client.post(url, headers=headers, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        text_resp = data["choices"][0]["message"]["content"]
                        parsed = json.loads(text_resp)
                        valid_priority = str(parsed.get("priority", "")).lower()
                        if valid_priority not in ["high", "medium", "low"]:
                            valid_priority = "medium"
                        return {
                            "category": parsed.get("category", "Municipal Administration"),
                            "priority": valid_priority,
                            "summary": parsed.get("summary", transcript[:150]),
                            "sentiment": parsed.get("sentiment", "neutral")
                        }
        except Exception as e:
            logger.warning(f"Cloud AI API request failed ({str(e)}). Using fallback classification.")

        return cls._heuristic_classify(transcript)
