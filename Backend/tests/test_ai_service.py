import pytest
from core.services.ai_service import AIService
from core.services.rag_service import RAGService, generate_fallback_embedding


@pytest.mark.asyncio
async def test_ai_heuristic_classifier():
    water_issue = "There is a severe water leakage and broken pipe on 5th main street."
    res = await AIService.classify_grievance(water_issue)
    assert res["category"] == "Water & Sanitation"
    assert res["priority"] in ["high", "medium", "low"]
    assert "leakage" in res["summary"].lower()

    power_issue = "Danger! Live electrical wire sparking and fire hazard near transformer!"
    res_power = await AIService.classify_grievance(power_issue)
    assert res_power["category"] == "Electricity & Power"
    assert res_power["priority"] == "high"
    assert res_power["sentiment"] == "urgent"


@pytest.mark.asyncio
async def test_rag_embedding_generator():
    text = "Road pothole repair request on 10th cross"
    emb = await RAGService.get_embedding(text)
    assert isinstance(emb, list)
    assert len(emb) == 768
    assert all(isinstance(x, float) for x in emb)


@pytest.mark.asyncio
async def test_claude_classification_mock(monkeypatch):
    from unittest.mock import AsyncMock, MagicMock
    import httpx

    fake_claude_response = MagicMock()
    fake_claude_response.status_code = 200
    fake_claude_response.json.return_value = {
        "content": [
            {
                "type": "text",
                "text": '{"category": "Roads & Infrastructure", "priority": "high", "summary": "Huge crater on 8th Ave", "sentiment": "urgent"}'
            }
        ]
    }

    mock_client = AsyncMock()
    mock_client.post.return_value = fake_claude_response
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None

    monkeypatch.setattr(httpx, "AsyncClient", lambda *args, **kwargs: mock_client)

    res = await AIService.classify_grievance("Giant pothole causing accidents on 8th avenue")
    assert res["category"] == "Roads & Infrastructure"
    assert res["priority"] == "high"
    assert res["sentiment"] == "urgent"
    assert "8th Ave" in res["summary"]
