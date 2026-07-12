import pytest
from fastapi.testclient import TestClient
from server import app
import os
import httpx
from unittest.mock import AsyncMock, patch

client = TestClient(app)

@pytest.fixture
def mock_marketplace():
    with patch("modules.ai.routes_ai_universities.marketplace.chat", new_callable=AsyncMock) as mock:
        yield mock

def test_ai_status():
    response = client.get("/api/ai/operations/status")
    assert response.status_code == 200
    data = response.json()
    assert "ollama_ok" in data
    assert "chroma_ok" in data

def test_recommend_universities_empty(mock_marketplace):
    payload = {
        "budget": 100,
        "country": "Mars",
        "scholarships_only": True
    }
    response = client.post("/api/ai/universities/recommend", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "recommendations" in data

def test_scholarship_match(mock_marketplace):
    payload = {
        "budget": 30000,
        "country": "usa"
    }
    response = client.post("/api/ai/universities/scholarship-match", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "matches" in data
