import pytest
from fastapi.testclient import TestClient
from server import api_router
from fastapi import FastAPI
from unittest.mock import patch, AsyncMock, MagicMock
from admin_auth import get_current_admin_flex
from routes_events import router

app = FastAPI()
app.include_router(router)

# Override admin auth for testing
def override_get_current_admin():
    return {"id": "test_admin@wehive.com", "role": "admin"}

app.dependency_overrides[get_current_admin_flex] = override_get_current_admin

client = TestClient(app)

@patch('routes_events.global_events_col')
def test_public_events(mock_col):
    # Patch the whole collection: count_documents is awaited too, and an unpatched
    # Motor call would hit the shared client bound to a closed TestClient loop.
    mock_cursor = MagicMock()
    mock_cursor.sort.return_value = mock_cursor
    mock_cursor.skip.return_value = mock_cursor
    mock_cursor.limit.return_value = mock_cursor
    mock_cursor.__aiter__.return_value = []
    mock_col.find.return_value = mock_cursor
    mock_col.count_documents = AsyncMock(return_value=0)

    response = client.get("/events/")
    assert response.status_code == 200
    assert response.json()["total"] == 0

@patch('routes_events.fetch_events_from_url', new_callable=AsyncMock)
@patch('routes_events.global_events_col.insert_one', new_callable=AsyncMock)
@patch('routes_events.audit_record', new_callable=AsyncMock)
def test_admin_trigger_scrape(mock_audit, mock_insert, mock_fetch):
    mock_fetch.return_value = [{"name": "Mock Event", "date": "2026-10-15", "category": "Tech"}]
    
    response = client.post("/events/scrape/trigger", json={
        "url": "https://example.com/events",
        "country_id": "usa",
        "platform": "website"
    })
    
    assert response.status_code == 200
    assert response.json()["events_added"] == 1
    mock_fetch.assert_called_once_with("https://example.com/events", "usa", "website")
    mock_insert.assert_called_once()
