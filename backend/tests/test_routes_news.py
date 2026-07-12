import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from server import app

client = TestClient(app)

@pytest.fixture
def mock_news_docs():
    return [
        {
            "_id": "60f7b3b3b3b3b3b3b3b3b3b4",
            "title": "Test News 1",
            "country_id": "usa",
            "content": "Test description",
            "date": "2026-10-15",
            "category": "F1",
            "source_url": "http://example.com/news",
            "status": "approved",
            "created_at": "2026-07-12T12:00:00"
        }
    ]

@patch('routes_news.global_news_col')
def test_get_news(mock_col, mock_news_docs):
    mock_cursor = AsyncMock()
    mock_cursor.sort.return_value = mock_cursor
    mock_cursor.limit.return_value = mock_cursor
    mock_cursor.to_list.return_value = mock_news_docs
    mock_col.find.return_value = mock_cursor

    response = client.get("/api/news?country_id=usa&category=F1")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["category"] == "F1"
    
@patch('routes_news.global_news_col')
def test_get_pending_news(mock_col, mock_news_docs):
    mock_cursor = AsyncMock()
    mock_cursor.sort.return_value = mock_cursor
    mock_cursor.to_list.return_value = mock_news_docs
    mock_col.find.return_value = mock_cursor

    response = client.get("/api/news/pending")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1

@patch('routes_news.global_news_col')
def test_approve_news(mock_col):
    mock_res = AsyncMock()
    mock_res.modified_count = 1
    mock_col.update_one.return_value = mock_res

    response = client.post("/api/news/60f7b3b3b3b3b3b3b3b3b3b4/approve")
    assert response.status_code == 200
    assert response.json()["status"] == "success"

@patch('routes_news.global_news_col')
def test_reject_news(mock_col):
    mock_res = AsyncMock()
    mock_res.modified_count = 1
    mock_col.update_one.return_value = mock_res

    response = client.post("/api/news/60f7b3b3b3b3b3b3b3b3b3b4/reject")
    assert response.status_code == 200
    assert response.json()["status"] == "success"
