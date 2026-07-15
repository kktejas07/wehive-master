import asyncio
from fastapi.testclient import TestClient
from server import app

client = TestClient(app)
print("GET /api/blogs :", client.get("/api/blogs?limit=30").status_code)
print("GET /api/blogs/ :", client.get("/api/blogs/?limit=30").status_code)
print("OPTIONS /api/blogs :", client.options("/api/blogs?limit=30", headers={"Origin": "http://localhost:3000"}).status_code)
print("OPTIONS /api/blogs/ :", client.options("/api/blogs/?limit=30", headers={"Origin": "http://localhost:3000"}).status_code)
