"""Chatbot Hive name verification."""
import os
import time
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL or not BASE_URL.startswith('http'):
    BASE_URL = 'https://premium-collab-6.preview.emergentagent.com'
API = f"{BASE_URL}/api"


def test_chatbot_hive_self_identifies():
    """POST /chatbot/sessions then send message -> reply mentions Hive."""
    s = requests.Session()

    # create session
    r = s.post(f"{API}/chatbot/sessions", json={})
    assert r.status_code in (200, 201), f"create session failed: {r.status_code} {r.text}"
    sid = r.json().get("id") or r.json().get("session_id") or r.json().get("_id")
    assert sid, f"no session id in response: {r.json()}"

    # send message asking for name
    r = s.post(
        f"{API}/chatbot/sessions/{sid}/messages",
        json={"text": "Hi there, what is your name?"},
        timeout=60,
    )
    assert r.status_code == 200, f"send msg failed: {r.status_code} {r.text}"
    data = r.json()

    # Response can be message object or dict with assistant reply field
    reply_text = ""
    if isinstance(data, dict):
        # try common fields
        for key in ("assistant", "reply", "text", "content", "message"):
            v = data.get(key)
            if isinstance(v, str):
                reply_text = v
                break
            if isinstance(v, dict) and isinstance(v.get("text") or v.get("content"), str):
                reply_text = v.get("text") or v.get("content")
                break
        # or messages list
        msgs = data.get("messages")
        if not reply_text and isinstance(msgs, list) and msgs:
            last = msgs[-1]
            reply_text = last.get("text") or last.get("content") or ""
    if not reply_text:
        reply_text = str(data)

    assert "Hive" in reply_text, f"Expected 'Hive' in reply, got: {reply_text!r}"
