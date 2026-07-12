import pytest
from fastapi.testclient import TestClient
from server import api_router
from fastapi import FastAPI
from unittest.mock import patch, AsyncMock
from core.admin_auth import get_current_admin_flex
from modules.core_api.routes_events import router

app = FastAPI()
app.include_router(router)

# Override admin auth for testing
def override_get_current_admin():
    return {"id": "test_admin@wehive.com", "role": "admin"}

app.dependency_overrides[get_current_admin_flex] = override_get_current_admin

client = TestClient(app)

@patch('routes_events.global_events_col.find')
def test_public_events(mock_find):
    # Mocking a mongo async cursor is tricky in sync TestClient without deep mocking, 
    # but we can do a simple mock to ensure the route exists and processes args.
    mock_cursor = AsyncMock()
    mock_cursor.sort.return_value = mock_cursor
    mock_cursor.limit.return_value = mock_cursor
    
    # Let's just mock __aiter__ to return an empty list for simplicity
    mock_cursor.__aiter__.return_value = []
    mock_find.return_value = mock_cursor
    
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
