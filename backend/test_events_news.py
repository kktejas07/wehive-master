from fastapi.testclient import TestClient
from server import app
import json

client = TestClient(app)

print("--- Testing /api/events ---")
response = client.get("/api/events?limit=30")
print(f"Status: {response.status_code}")
if response.status_code == 200:
    print("Success! Items returned:", len(response.json().get('items', [])))
else:
    print("Error:", response.text)

print("\n--- Testing /api/news ---")
response = client.get("/api/news?limit=10")
print(f"Status: {response.status_code}")
if response.status_code == 200:
    print("Success! Items returned:", len(response.json().get('items', [])))
else:
    print("Error:", response.text)

print("\n--- Testing /api/blogs ---")
response = client.get("/api/blogs?limit=30")
print(f"Status: {response.status_code}")
if response.status_code == 200:
    print("Success! Items returned:", len(response.json().get('items', [])))
else:
    print("Error:", response.text)
