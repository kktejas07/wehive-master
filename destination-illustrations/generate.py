#!/usr/bin/env python3
"""Generate premium travel illustrations for every country using Replicate (Flux).

Usage:
    export REPLICATE_API_TOKEN="r8_..."
    python generate.py

    # Generate a single country:
    python generate.py --country india

    # Resume from index (if interrupted):
    python generate.py --resume-from 50

    # Dry-run — print prompts only:
    python generate.py --dry-run

Requirements:
    pip install replicate httpx
"""

import json
import os
import sys
import time
import argparse
from pathlib import Path

import httpx
import replicate


HERE = Path(__file__).parent
MANIFEST_PATH = HERE / "manifest.json"
OUTPUT_DIR = HERE / "output"

MODEL = "black-forest-labs/flux-schnell"

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


def generate_image(prompt: str, aspect_ratio: str = "16:9") -> str | None:
    try:
        output = replicate.run(
            MODEL,
            input={
                "prompt": prompt,
                "aspect_ratio": aspect_ratio,
                "num_outputs": 1,
                "go_fast": True,
                "num_inference_steps": 4,
            },
        )
        return output[0] if output else None
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
    parser = argparse.ArgumentParser(description="Generate premium country illustrations via Replicate")
    parser.add_argument("--country", help="Generate only this country (filename or name)")
    parser.add_argument("--resume-from", type=int, default=0, help="Resume from this index")
    parser.add_argument("--dry-run", action="store_true", help="Print prompts without generating")
    parser.add_argument("--aspect-ratio", default="16:9", help='Aspect ratio (default: 16:9)')
    parser.add_argument("--delay", type=float, default=2.0, help="Delay between API calls (default: 2s)")
    args = parser.parse_args()

    api_token = os.environ.get("REPLICATE_API_TOKEN")
    if not api_token and not args.dry_run:
        print("Error: REPLICATE_API_TOKEN environment variable not set", file=sys.stderr)
        sys.exit(1)

    manifest = load_manifest()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    start_idx = max(args.resume_from, load_checkpoint())
    total = len(manifest)
    success = 0
    skipped = 0

    print(f"Model: {MODEL}")
    print(f"Aspect ratio: {args.aspect_ratio}")
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
        print(f"  Prompt: {prompt[:100]}...")

        if args.dry_run:
            print()
            continue

        print("  Generating...", end=" ", flush=True)
        url = generate_image(prompt, args.aspect_ratio)
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
