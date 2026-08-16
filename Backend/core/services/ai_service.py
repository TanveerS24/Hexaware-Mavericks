import json
import logging
import re
from typing import Dict, Any, Optional
import httpx
from google import genai
from google.genai import types

from core.config import settings

logger = logging.getLogger(__name__)


class GeminiProvider:
    @staticmethod
    def get_client() -> Optional[genai.Client]:
        # Fallback to AI_API_KEY if GOOGLE_API_KEY isn't explicitly set
        api_key = getattr(settings, "GOOGLE_API_KEY", getattr(settings, "AI_API_KEY", None))
        try:
            return genai.Client(api_key=api_key)
        except Exception as e:
            # We want to know if this is failing
            settings.GEMINI_INIT_ERROR = str(e)
            return None

    @staticmethod
    async def query_citizen_chatbot(context_data: str, user_query: str) -> Optional[str]:
        client = GeminiProvider.get_client()
        if not client:
            return None
        
        prompt = f"""You are a helpful AI assistant for the Citizen Grievance Portal.
Use ONLY the following context about the citizen's active complaints to answer their question.
If the answer is not contained in the context, politely inform them that you do not have that information.
Do NOT invent or hallucinate information.

Context (Citizen's Complaints):
{context_data}

Citizen's Question:
{user_query}

Answer:"""
        try:
            response = client.models.generate_content(
                model='gemini-1.5-flash',
                contents=prompt
            )
            return response.text
        except Exception as e:
            logger.error(f"Gemini chatbot query failed: {e}")
            return None


class AIService:
    """
    Handles Speech-to-Text transcription and Cloud AI API (Gemini / OpenAI-compatible / Claude)
    structured complaint classification with robust heuristic fallback.
    """

    @staticmethod
    async def transcribe_audio(audio_bytes: bytes, mime_type: str = "audio/mp3", filename: str = "audio.wav") -> str:
        """
        Transcribe audio input into plain text using Gemini.
        """
        if not audio_bytes or len(audio_bytes) < 10:
            return "Citizen complaint submitted via audio recording."
        
        client = GeminiProvider.get_client()
        if client:
            # Try multiple models since the user's project might have specific access
            models_to_try = ['gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro']
            last_error = ""
            for model_name in models_to_try:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=[
                            "Please accurately transcribe this audio recording. Return ONLY the transcribed text, with no extra commentary or formatting.",
                            types.Part.from_bytes(data=audio_bytes, mime_type=mime_type)
                        ]
                    )
                    if response and response.text:
                        return response.text.strip()
                except Exception as e:
                    last_error = str(e)
                    continue
            
            # If all failed, return the last error
            return f"DEBUG ERROR (Generate Content Failed for all models). Last error: {last_error}"

        init_error = getattr(settings, "GEMINI_INIT_ERROR", "Unknown or no client")
        api_key = getattr(settings, "GOOGLE_API_KEY", getattr(settings, "AI_API_KEY", ""))
        return f"DEBUG ERROR (Init Failed): {init_error} | Key used starts with: {api_key[:4] if api_key else 'None'}"

    @staticmethod
    def _heuristic_classify(text: str) -> Dict[str, Any]:
        """
        Rule-based classifier used as an instant, zero-downtime fallback.
        """
        lower = text.lower()
        if any(w in lower for w in ["water", "pipe", "leak", "drain", "sewage", "tap", "drinking"]):
            category = "water and sewage"
            department = "water and sewage"
        elif any(w in lower for w in ["electric", "power", "wire", "light", "transformer", "spark", "blackout", "pole"]):
            category = "electricity"
            department = "electricity"
        elif any(w in lower for w in ["road", "transport", "bus", "pothole", "traffic", "street"]):
            category = "Road and transport"
            department = "Road and transport"
        else:
            category = "general"
            department = "Road and transport"

        summary = text.strip()
        if len(summary) > 160:
            summary = summary[:157] + "..."

        return {
            "category": category,
            "department": department,
            "priority": "medium",
            "sentiment": "neutral",
            "confidence": "low",
            "summary": summary
        }

    @classmethod
    async def classify_grievance(cls, transcript: str) -> Dict[str, Any]:
        """
        Calls Cloud AI API to classify grievance and extract category, priority, summary, and sentiment.
        Falls back seamlessly to heuristic classifier if API is not configured or fails.
        """
        if not getattr(settings, "AI_API_KEY", getattr(settings, "GOOGLE_API_KEY", None)):
            return cls._heuristic_classify(transcript)

        prompt = f"""You are an AI assistant for a municipal citizen grievance redressal platform.
Analyze the following citizen complaint and return ONLY a valid JSON object matching this schema:
{{
  "category": "Road and transport | water and sewage | electricity",
  "priority": "high | medium | low",
  "summary": "1-2 sentence concise neutral summary of the core issue",
  "sentiment": "urgent | frustrated | neutral | positive",
  "english_translation": "Accurate English translation of the complaint if it is in another language, otherwise exact same text"
}}

Complaint Transcript:
\"\"\"{transcript}\"\"\"

Response:"""

        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                provider = getattr(settings, "AI_PROVIDER", "gemini")
                ai_model = getattr(settings, "AI_MODEL", "gemini-1.5-flash")
                ai_api_key = getattr(settings, "AI_API_KEY", getattr(settings, "GOOGLE_API_KEY", ""))

                # Auto-detect Grok xAI API Key
                if ai_api_key.startswith("xai-"):
                    provider = "grok"
                    ai_model = "grok-beta"
                    settings.AI_BASE_URL = "https://api.x.ai/v1"

                # 1. Anthropic Claude API
                if provider in ["claude", "anthropic"] or "claude" in ai_model.lower():
                    base_url = (getattr(settings, "AI_BASE_URL", "https://api.anthropic.com/v1")).rstrip("/")
                    url = f"{base_url}/messages"
                    headers = {
                        "x-api-key": ai_api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json"
                    }
                    payload = {
                        "model": ai_model if "claude" in ai_model.lower() else "claude-3-5-haiku-20241022",
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
                                "sentiment": parsed.get("sentiment", "neutral"),
                                "english_translation": parsed.get("english_translation", transcript)
                            }

                # 2. Google Gemini API
                elif provider == "gemini" or "gemini" in ai_model.lower():
                    base_url = getattr(settings, "AI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta")
                    model_name = ai_model if "models/" in ai_model else f"models/{ai_model}"
                    url = f"{base_url}/{model_name}:generateContent?key={ai_api_key}"
                    
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
                                "sentiment": parsed.get("sentiment", "neutral"),
                                "english_translation": parsed.get("english_translation", transcript)
                            }

                # 3. OpenAI or OpenAI-compatible API
                else:
                    base_url = (getattr(settings, "AI_BASE_URL", "https://api.openai.com/v1")).rstrip("/")
                    url = f"{base_url}/chat/completions"
                    headers = {
                        "Authorization": f"Bearer {ai_api_key}",
                        "Content-Type": "application/json"
                    }
                    payload = {
                        "model": ai_model,
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
                            "sentiment": parsed.get("sentiment", "neutral"),
                            "english_translation": parsed.get("english_translation", transcript)
                        }
        except Exception as e:
            logger.warning(f"Cloud AI API request failed ({str(e)}). Using fallback classification.")

        return cls._heuristic_classify(transcript)

    @classmethod
    async def translate_text(cls, text: str) -> str:
        """
        Translates text to English using the configured AI provider.
        """
        if not getattr(settings, "AI_API_KEY", getattr(settings, "GOOGLE_API_KEY", None)):
            return text

        prompt = f"Translate the following text to English accurately. Return ONLY the English translation, nothing else.\n\nText: {text}"
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                provider = getattr(settings, "AI_PROVIDER", "gemini")
                ai_model = getattr(settings, "AI_MODEL", "gemini-1.5-flash")
                ai_api_key = getattr(settings, "AI_API_KEY", getattr(settings, "GOOGLE_API_KEY", ""))

                if ai_api_key.startswith("xai-"):
                    provider = "grok"
                    ai_model = "grok-beta"
                    settings.AI_BASE_URL = "https://api.x.ai/v1"

                # 1. Anthropic
                if provider in ["claude", "anthropic"] or "claude" in ai_model.lower():
                    base_url = (getattr(settings, "AI_BASE_URL", "https://api.anthropic.com/v1")).rstrip("/")
                    url = f"{base_url}/messages"
                    headers = {"x-api-key": ai_api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"}
                    payload = {
                        "model": ai_model if "claude" in ai_model.lower() else "claude-3-5-haiku-20241022",
                        "max_tokens": 1024,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.1
                    }
                    resp = await client.post(url, headers=headers, json=payload)
                    if resp.status_code == 200:
                        content_blocks = resp.json().get("content", [])
                        if content_blocks and content_blocks[0].get("type") == "text":
                            return content_blocks[0].get("text", "").strip()

                # 2. Google Gemini
                elif provider == "gemini" or "gemini" in ai_model.lower():
                    base_url = getattr(settings, "AI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta")
                    model_name = ai_model if "models/" in ai_model else f"models/{ai_model}"
                    url = f"{base_url}/{model_name}:generateContent?key={ai_api_key}"
                    payload = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0.1}}
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        candidates = resp.json().get("candidates", [])
                        if candidates:
                            return candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()

                # 3. OpenAI or Grok
                else:
                    base_url = (getattr(settings, "AI_BASE_URL", "https://api.openai.com/v1")).rstrip("/")
                    url = f"{base_url}/chat/completions"
                    headers = {"Authorization": f"Bearer {ai_api_key}", "Content-Type": "application/json"}
                    payload = {
                        "model": ai_model,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.1
                    }
                    resp = await client.post(url, headers=headers, json=payload)
                    if resp.status_code == 200:
                        return resp.json()["choices"][0]["message"]["content"].strip()

        except Exception as e:
            logger.warning(f"Translation API request failed ({str(e)}).")

        return text

    @classmethod
    async def query_citizen_chatbot(cls, context_data: str, user_query: str) -> str:
        """
        Query Gemini based on citizen's complaint history context.
        """
        result = await GeminiProvider.query_citizen_chatbot(context_data, user_query)
        if result:
            return result
        return "I apologize, but I am currently unable to process your request. Please try again later."
