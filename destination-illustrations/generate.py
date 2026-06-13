#!/usr/bin/env python3
"""Generate premium travel illustrations for every country using Together AI (Flux).

Usage:
    export TOGETHER_API_KEY="..."
    python generate.py

    # Generate a single country:
    python generate.py --country india

    # Resume from index (if interrupted):
    python generate.py --resume-from 50

    # Dry-run — print prompts only:
    python generate.py --dry-run

Requirements:
    pip install httpx
"""

import json
import os
import sys
import time
import argparse
import base64
from pathlib import Path

import httpx


HERE = Path(__file__).parent
MANIFEST_PATH = HERE / "manifest.json"
OUTPUT_DIR = HERE / "output"

API_URL = "https://api.together.xyz/v1/images/generations"
MODEL = "black-forest-labs/FLUX.1-schnell-Free"

STYLE_SUFFIX = (
    "Modern flat-vector illustration blended with semi-realistic digital art. "
    "Bright natural daylight, beautiful blue sky with soft white clouds. "
    "Vibrant but elegant professional colors. Clean composition, centered subject, "
    "plenty of negative space. No text, no flags, no logos, no watermarks, no people crowds. "
    "Premium travel illustration style suitable for a luxury visa consultancy website."
)


def load_manifest() -> list[dict]:
    with open(MANIFEST_PATH) as f:
        return json.load(f)


def load_checkpoint() -> int:
    path = OUTPUT_DIR / ".checkpoint"
    if path.exists():
        return int(path.read_text().strip())
    return 0


def save_checkpoint(idx: int):
    path = OUTPUT_DIR / ".checkpoint"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(str(idx))


def image_exists(filename: str) -> bool:
    return (OUTPUT_DIR / filename).exists()


def build_prompt(entry: dict) -> str:
    return (
        f"Premium travel illustration of {entry['country']}: "
        f"{entry['landmark']}. "
        f"{STYLE_SUFFIX}"
    )


def generate_image(api_key: str, prompt: str, width: int = 1024, height: int = 768) -> bytes | None:
    try:
        resp = httpx.post(
            API_URL,
            json={
                "model": MODEL,
                "prompt": prompt,
                "width": width,
                "height": height,
                "steps": 4,
                "n": 1,
            },
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            timeout=120,
        )
        resp.raise_for_status()
        data = resp.json()
        b64 = data.get("data", [{}])[0].get("b64_json")
        if b64:
            return base64.b64decode(b64)
        url = data.get("data", [{}])[0].get("url")
        if url:
            r = httpx.get(url, timeout=60)
            r.raise_for_status()
            return r.content
        print(f"  Unexpected response: {str(data)[:200]}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"  API error: {e}", file=sys.stderr)
        return None


def main():
    parser = argparse.ArgumentParser(description="Generate premium country illustrations via Together AI")
    parser.add_argument("--country", help="Generate only this country (filename or name)")
    parser.add_argument("--resume-from", type=int, default=0, help="Resume from this index")
    parser.add_argument("--dry-run", action="store_true", help="Print prompts without generating")
    parser.add_argument("--width", type=int, default=1024, help="Image width (default: 1024)")
    parser.add_argument("--height", type=int, default=768, help="Image height (default: 768)")
    parser.add_argument("--delay", type=float, default=1.5, help="Delay between API calls (default: 1.5s)")
    args = parser.parse_args()

    api_key = os.environ.get("TOGETHER_API_KEY")
    if not api_key and not args.dry_run:
        print("Error: TOGETHER_API_KEY environment variable not set", file=sys.stderr)
        sys.exit(1)

    manifest = load_manifest()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    start_idx = max(args.resume_from, load_checkpoint())
    total = len(manifest)
    success = 0
    skipped = 0

    print(f"Model: {MODEL}")
    print(f"Size: {args.width}x{args.height}")
    print(f"Total countries: {total}")
    print()

    for idx, entry in enumerate(manifest):
        if idx < start_idx:
            continue

        filename = entry["filename"]

        if args.country and args.country.lower() not in (
            filename.lower(),
            entry["country"].lower(),
        ):
            continue

        if image_exists(filename):
            print(f"[{idx+1}/{total}] SKIP  {filename} — already exists")
            skipped += 1
            continue

        prompt = build_prompt(entry)
        print(f"[{idx+1}/{total}] {filename}")
        print(f"  {entry['country']} — {entry['landmark']}")

        if args.dry_run:
            print()
            continue

        print("  Generating...", end=" ", flush=True)
        image_data = generate_image(api_key, prompt, args.width, args.height)
        if not image_data:
            print("FAILED")
            continue

        dest = OUTPUT_DIR / filename
        dest.write_bytes(image_data)
        size_kb = dest.stat().st_size / 1024
        print(f"OK ({size_kb:.0f} KB)")
        success += 1
        save_checkpoint(idx + 1)

        time.sleep(args.delay)

    print(f"\nDone. Generated: {success}, Skipped: {skipped}, Total: {total}")


if __name__ == "__main__":
    main()
