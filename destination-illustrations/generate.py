#!/usr/bin/env python3
"""Generate premium travel illustrations for every country using OpenAI DALL-E 3.

Usage:
    # Generate all countries (requires OPENAI_API_KEY in env):
    python generate.py

    # Generate a specific country:
    python generate.py --country india

    # Resume from a specific index (e.g. if interrupted):
    python generate.py --resume-from 50

    # Dry-run — print prompts without calling API:
    python generate.py --dry-run

Requirements:
    pip install openai pillow httpx
"""

import json
import os
import sys
import time
import argparse
from pathlib import Path

import httpx
from openai import OpenAI


HERE = Path(__file__).parent
MANIFEST_PATH = HERE / "manifest.json"
OUTPUT_DIR = HERE / "output"

SYSTEM_PROMPT = (
    "You are a world-class travel illustrator. Generate a premium destination illustration "
    "in a modern flat-vector blended with soft semi-realistic digital art style. "
    "Bright natural daylight, beautiful blue sky with soft clouds, vibrant but elegant colors. "
    "Clean composition with plenty of negative space. "
    "No text, no country names, no flags, no logos, no watermarks, no borders, no frames, "
    "no UI elements, no crowds of tourists. "
    "The artwork should feel premium, trustworthy, and suitable for a professional visa consultancy website."
)

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


def generate_image(client: OpenAI, prompt: str, size: str = "1792x1024") -> str | None:
    try:
        resp = client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size=size,
            quality="hd",
            n=1,
        )
        return resp.data[0].url
    except Exception as e:
        print(f"  API error: {e}", file=sys.stderr)
        return None


def download_image(url: str, dest: Path) -> bool:
    try:
        resp = httpx.get(url, timeout=120, follow_redirects=True)
        resp.raise_for_status()
        dest.write_bytes(resp.content)
        return True
    except Exception as e:
        print(f"  Download error: {e}", file=sys.stderr)
        return False


def main():
    parser = argparse.ArgumentParser(description="Generate premium country illustrations")
    parser.add_argument("--country", help="Generate only this country (filename or name)")
    parser.add_argument("--resume-from", type=int, default=0, help="Resume from this index")
    parser.add_argument("--dry-run", action="store_true", help="Print prompts without generating")
    parser.add_argument("--size", default="1792x1024", help='Image size (default: 1792x1024)')
    parser.add_argument("--delay", type=float, default=3.0, help="Delay between API calls in seconds")
    args = parser.parse_args()

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key and not args.dry_run:
        print("Error: OPENAI_API_KEY environment variable not set", file=sys.stderr)
        sys.exit(1)

    client = None if args.dry_run else OpenAI(api_key=api_key)
    manifest = load_manifest()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    start_idx = max(args.resume_from, load_checkpoint())
    total = len(manifest)
    success = 0
    skipped = 0

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
        print(f"  Prompt: {prompt[:120]}...")

        if args.dry_run:
            print()
            continue

        print("  Generating...", end=" ", flush=True)
        url = generate_image(client, prompt, args.size)
        if not url:
            print("FAILED")
            continue

        print("Downloading...", end=" ", flush=True)
        dest = OUTPUT_DIR / filename
        if download_image(url, dest):
            size_kb = dest.stat().st_size / 1024
            print(f"OK ({size_kb:.0f} KB)")
            success += 1
            save_checkpoint(idx + 1)
        else:
            print("FAILED")

        time.sleep(args.delay)

    print(f"\nDone. Generated: {success}, Skipped: {skipped}, Total: {total}")


if __name__ == "__main__":
    main()
