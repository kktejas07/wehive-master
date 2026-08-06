import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))

from httpx import AsyncClient, ASGITransport
from server import app

async def run_tests():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        print("--- Testing /api/events ---")
        response = await client.get("/api/events?limit=30")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("Success! Items returned:", len(response.json().get('items', [])))
        else:
            print("Error:", response.text)

        print("\n--- Testing /api/news ---")
        response = await client.get("/api/news?limit=10")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("Success! Items returned:", len(response.json().get('items', [])))
        else:
            print("Error:", response.text)

        print("\n--- Testing /api/blogs ---")
        response = await client.get("/api/blogs?limit=30")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("Success! Items returned:", len(response.json().get('items', [])))
        else:
            print("Error:", response.text)

if __name__ == "__main__":
    asyncio.run(run_tests())
