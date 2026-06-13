#!/usr/bin/env python3
"""Generate a premium world map illustration via Together AI."""
import base64, os, sys
from pathlib import Path
import httpx

API_URL = "https://api.together.xyz/v1/images/generations"
KEY = os.environ.get("TOGETHER_API_KEY", "")
if not KEY:
    print("Error: TOGETHER_API_KEY not set")
    sys.exit(1)

prompt = (
    "Premium world map illustration showing all continents in flat vector style "
    "blended with semi-realistic digital art. Detailed continent outlines in deep "
    "navy blue against a warm golden background. Subtle compass rose in corner. "
    "Modern travel aesthetic with clean elegant composition. Golden hour lighting. "
    "NO text, NO letters, NO words, NO labels, NO flags anywhere. "
    "1200x600 landscape orientation suitable for a website hero section."
)

resp = httpx.post(API_URL, json={
    "model": "black-forest-labs/FLUX.1-schnell",
    "prompt": prompt,
    "width": 1024,
    "height": 512,
    "steps": 8,
    "n": 1,
}, headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}, timeout=120)

resp.raise_for_status()
data = resp.json()
item = data["data"][0]
b64 = item.get("b64_json")
if b64:
    img = base64.b64decode(b64)
elif item.get("url"):
    img = httpx.get(item["url"]).content
else:
    print("No image data:", str(data)[:200])
    sys.exit(1)

dest = Path("frontend/public/images/world-map.webp")
dest.write_bytes(img)
print(f"OK {len(img)/1024:.0f} KB -> {dest}")
