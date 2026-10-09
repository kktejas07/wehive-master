import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock, MagicMock

from server import app
from admin_auth import get_current_admin_flex

client = TestClient(app)


@pytest.fixture(autouse=True)
def _admin_override():
    app.dependency_overrides[get_current_admin_flex] = lambda: {"_id": "admin", "is_admin": True}
    yield
    app.dependency_overrides.pop(get_current_admin_flex, None)


def _mock_find(mock_col, docs):
    """Motor: find() is sync and chainable; count_documents/to_list are awaited."""
    cursor = MagicMock()
    cursor.sort.return_value = cursor
    cursor.skip.return_value = cursor
    cursor.limit.return_value = cursor
    cursor.to_list = AsyncMock(return_value=docs)
    mock_col.find.return_value = cursor
    mock_col.count_documents = AsyncMock(return_value=len(docs))

@pytest.fixture
def mock_blog_docs():
    return [
        {
            "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
            "title": "Test Blog 1",
            "country_id": "usa",
            "description": "Test description",
            "readTime": "5 min",
            "category": "F1",
            "imageUrl": "http://image.com/1.png",
            "author": {"name": "AI", "initials": "AI"},
            "status": "approved",
            "created_at": datetime(2026, 7, 12, 12, 0, 0)
        }
    ]

@patch('routes_blogs.global_blogs_col')
def test_get_blogs(mock_col, mock_blog_docs):
    _mock_find(mock_col, mock_blog_docs)

    response = client.get("/api/blogs?country_id=usa&category=F1")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1
    assert data["items"][0]["category"] == "F1"
    
@patch('routes_blogs.global_blogs_col')
def test_get_pending_blogs(mock_col, mock_blog_docs):
    _mock_find(mock_col, mock_blog_docs)

    response = client.get("/api/blogs/pending")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1

@patch('routes_blogs.global_blogs_col')
def test_approve_blog(mock_col):
    mock_col.update_one = AsyncMock(return_value=MagicMock(modified_count=1))

    response = client.post("/api/blogs/60f7b3b3b3b3b3b3b3b3b3b3/approve")
    assert response.status_code == 200
    assert response.json()["status"] == "success"

@patch('routes_blogs.global_blogs_col')
def test_reject_blog(mock_col):
    mock_col.update_one = AsyncMock(return_value=MagicMock(modified_count=1))

    response = client.post("/api/blogs/60f7b3b3b3b3b3b3b3b3b3b3/reject")
    assert response.status_code == 200
    assert response.json()["status"] == "success"
