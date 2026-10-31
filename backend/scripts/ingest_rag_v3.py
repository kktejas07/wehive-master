"""RAG v3 ingestion — parse wehive-complete-prompts-v3.md and upsert to Pinecone.

Usage:
  python ingest_rag_v3.py                          # ingest all v3 namespaces
  python ingest_rag_v3.py --namespace wehive-exam-prep
  python ingest_rag_v3.py --dry-run                # preview without upserting
  python ingest_rag_v3.py --namespace wehive-f1-sevis --dry-run

Environment variables required (unless --dry-run):
  OPENAI_API_KEY
  PINECONE_API_KEY
"""

from __future__ import annotations

import argparse
import hashlib
import logging
import os
import re
import sys
import time
from pathlib import Path
from typing import Iterator

logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(message)s",
    level=logging.INFO,
    stream=sys.stdout,
)
log = logging.getLogger("ingest_rag_v3")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

PINECONE_INDEX = "wehive-prod-v3"
EMBED_MODEL = "text-embedding-3-large"
EMBED_DIMS = 3072
EMBED_BATCH = 16          # OpenAI rate-limit-safe batch size
UPSERT_BATCH = 100        # Pinecone upsert batch size
MAX_TOKENS = 500          # rough token cap per chunk (1 token ≈ 4 chars)
MAX_CHARS = MAX_TOKENS * 4

PROMPTS_DOC = (
    Path(__file__).resolve().parent.parent.parent
    / "docs"
    / "wehive-complete-prompts-v3.md"
)

# Map markdown section header keywords → Pinecone namespace names.
# Keys are lowercased substrings matched against the "## N. TITLE" header.
SECTION_NAMESPACE_MAP: dict[str, str] = {
    "wehive-country-rules":  "wehive-country-rules",
    "wehive-f1-sevis":       "wehive-f1-sevis",
    "wehive-passport-matrix":"wehive-passport-matrix",
    "wehive-interview-prep": "wehive-interview-prep",
    "wehive-exam-prep":      "wehive-exam-prep",
    "wehive-partners":       "wehive-partners",
    # v3-expanded namespaces
    "wehive-student-docs":   "wehive-student-docs",
    "wehive-scholarships":   "wehive-scholarships",
    "wehive-cost-of-living": "wehive-cost-of-living",
    "wehive-sop-templates":  "wehive-sop-templates",
    "wehive-wehive-faq":     "wehive-wehive-faq",
    # v3-expanded namespaces batch 2
    "wehive-universities":   "wehive-universities",
    "wehive-jobs-and-pr":    "wehive-jobs-and-pr",
    # v3-expanded namespaces batch 3 (Tier 1 gap-fill)
    "wehive-visa-timelines":      "wehive-visa-timelines",
    "wehive-financial-aid":       "wehive-financial-aid",
    "wehive-application-builder": "wehive-application-builder",
    "wehive-health-insurance":    "wehive-health-insurance",
    "wehive-travel-and-arrival":  "wehive-travel-and-arrival",
}

V3_NAMESPACES = list(SECTION_NAMESPACE_MAP.values())

# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------

def _header_namespace(line: str) -> str | None:
    """Return namespace if line is a top-level '## N. WEHIVE-XYZ' header."""
    m = re.match(r"^##\s+\d+\.\s+(.+)$", line.strip())
    if not m:
        return None
    title = m.group(1).lower()
    for key, ns in SECTION_NAMESPACE_MAP.items():
        if key in title:
            return ns
    return None


def parse_sections(doc_path: Path) -> dict[str, str]:
    """Return {namespace: raw_section_text} for all v3 namespaces found in the doc."""
    sections: dict[str, str] = {}
    current_ns: str | None = None
    current_lines: list[str] = []

    with doc_path.open(encoding="utf-8") as fh:
        for line in fh:
            ns = _header_namespace(line)
            if ns is not None:
                # save previous
                if current_ns and current_lines:
                    sections[current_ns] = "".join(current_lines)
                current_ns = ns
                current_lines = [line]
            elif current_ns is not None:
                # stop accumulating once we hit the NEXT top-level ## section
                # that is NOT one of ours (i.e. another numbered section)
                if re.match(r"^##\s+\d+\.", line.strip()) and _header_namespace(line) is None:
                    sections[current_ns] = "".join(current_lines)
                    current_ns = None
                    current_lines = []
                else:
                    current_lines.append(line)

    if current_ns and current_lines:
        sections[current_ns] = "".join(current_lines)

    return sections


# ---------------------------------------------------------------------------
# Chunking
# ---------------------------------------------------------------------------

def _split_qa_block(text: str) -> list[str]:
    """Split on blank lines between Q/A pairs; keep each pair together."""
    blocks: list[str] = []
    current: list[str] = []
    for line in text.splitlines(keepends=True):
        if line.strip() == "" and current:
            block = "".join(current).strip()
            if block:
                blocks.append(block)
            current = []
        else:
            current.append(line)
    if current:
        block = "".join(current).strip()
        if block:
            blocks.append(block)
    return blocks


def chunk_section(text: str) -> list[str]:
    """Chunk a section into ≤MAX_CHARS pieces, preferring Q&A or paragraph breaks."""
    # First try splitting on Q&A pairs (lines starting with Q: or **Q)
    qa_pattern = re.compile(r"^(?:\*\*Q|\bQ\s*[:.]|\d+\.\s+Q\b)", re.MULTILINE)
    qa_positions = [m.start() for m in qa_pattern.finditer(text)]

    raw_blocks: list[str]
    if len(qa_positions) > 1:
        # build blocks starting at each Q position
        raw_blocks = []
        for i, pos in enumerate(qa_positions):
            end = qa_positions[i + 1] if i + 1 < len(qa_positions) else len(text)
            raw_blocks.append(text[pos:end].strip())
    else:
        raw_blocks = _split_qa_block(text)

    # Merge short blocks and split oversized ones
    chunks: list[str] = []
    buf = ""

    def flush(b: str) -> None:
        b = b.strip()
        if b:
            chunks.append(b)

    for block in raw_blocks:
        if not block:
            continue
        if len(block) > MAX_CHARS:
            # hard split at paragraph or sentence boundary
            if buf:
                flush(buf)
                buf = ""
            for i in range(0, len(block), MAX_CHARS):
                flush(block[i : i + MAX_CHARS])
        elif len(buf) + len(block) + 2 <= MAX_CHARS:
            buf = (buf + "\n\n" + block).strip() if buf else block
        else:
            flush(buf)
            buf = block

    flush(buf)
    return chunks or [text[:MAX_CHARS].strip()]


# ---------------------------------------------------------------------------
# Embedding
# ---------------------------------------------------------------------------

def embed_batch(texts: list[str]) -> list[list[float]]:
    """Call OpenAI Embeddings API for a batch of texts."""
    import openai  # type: ignore

    client = openai.OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    response = client.embeddings.create(model=EMBED_MODEL, input=texts)
    return [item.embedding for item in sorted(response.data, key=lambda x: x.index)]


def embed_all(texts: list[str]) -> list[list[float]]:
    """Embed texts in EMBED_BATCH-sized batches with simple retry."""
    vectors: list[list[float]] = []
    for i in range(0, len(texts), EMBED_BATCH):
        batch = texts[i : i + EMBED_BATCH]
        for attempt in range(3):
            try:
                vectors.extend(embed_batch(batch))
                break
            except Exception as exc:
                if attempt == 2:
                    raise
                wait = 2 ** attempt
                log.warning("Embedding batch %d failed (%s); retry in %ds", i // EMBED_BATCH, exc, wait)
                time.sleep(wait)
    return vectors


# ---------------------------------------------------------------------------
# Pinecone
# ---------------------------------------------------------------------------

def get_pinecone_index():
    from pinecone import Pinecone  # type: ignore

    pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
    return pc.Index(PINECONE_INDEX)


def upsert_to_pinecone(
    index,
    namespace: str,
    ids: list[str],
    vectors: list[list[float]],
    metadatas: list[dict],
) -> None:
    records = [
        {"id": vid, "values": vec, "metadata": meta}
        for vid, vec, meta in zip(ids, vectors, metadatas)
    ]
    for i in range(0, len(records), UPSERT_BATCH):
        batch = records[i : i + UPSERT_BATCH]
        index.upsert(vectors=batch, namespace=namespace)
        log.info("  upserted %d/%d vectors to namespace=%s", i + len(batch), len(records), namespace)


# ---------------------------------------------------------------------------
# Stable ID generation
# ---------------------------------------------------------------------------

def make_chunk_id(namespace: str, chunk_index: int, text: str) -> str:
    raw = f"{namespace}::{chunk_index}::{text[:120]}"
    return hashlib.sha1(raw.encode()).hexdigest()[:20]


# ---------------------------------------------------------------------------
# Main ingestion
# ---------------------------------------------------------------------------

def ingest_namespace(
    namespace: str,
    section_text: str,
    *,
    dry_run: bool,
    index=None,
) -> dict:
    chunks = chunk_section(section_text)
    log.info("namespace=%s  chunks=%d", namespace, len(chunks))

    ids = [make_chunk_id(namespace, i, c) for i, c in enumerate(chunks)]
    metadatas = [
        {
            "namespace": namespace,
            "section": namespace,
            "chunk_index": i,
            "source": "wehive-complete-prompts-v3.md",
            "chars": len(c),
        }
        for i, c in enumerate(chunks)
    ]

    if dry_run:
        for i, (cid, chunk, meta) in enumerate(zip(ids, chunks, metadatas)):
            preview = chunk[:120].replace("\n", " ")
            log.info("  [dry-run] chunk %d  id=%s  preview=%r", i, cid, preview)
        return {"namespace": namespace, "chunks": len(chunks), "dry_run": True}

    log.info("  embedding %d chunks …", len(chunks))
    vectors = embed_all(chunks)

    log.info("  upserting to Pinecone index=%s namespace=%s …", PINECONE_INDEX, namespace)
    upsert_to_pinecone(index, namespace, ids, vectors, metadatas)

    return {"namespace": namespace, "chunks": len(chunks), "upserted": len(ids)}


def run(
    namespaces: list[str] | None = None,
    *,
    dry_run: bool = False,
) -> None:
    doc = PROMPTS_DOC
    if not doc.exists():
        log.error("Prompts doc not found: %s", doc)
        sys.exit(1)

    log.info("Parsing %s …", doc)
    sections = parse_sections(doc)
    found = list(sections.keys())
    log.info("Found %d v3 sections: %s", len(found), found)

    target = namespaces or V3_NAMESPACES
    missing = [ns for ns in target if ns not in sections]
    if missing:
        log.warning("Sections not found in doc: %s", missing)

    index = None
    if not dry_run:
        log.info("Connecting to Pinecone index=%s …", PINECONE_INDEX)
        index = get_pinecone_index()

    results = []
    for ns in target:
        if ns not in sections:
            log.warning("Skipping %s — section not found", ns)
            continue
        log.info("--- %s ---", ns)
        result = ingest_namespace(ns, sections[ns], dry_run=dry_run, index=index)
        results.append(result)

    log.info("=== Done ===")
    for r in results:
        if r.get("dry_run"):
            log.info("  [dry-run] %s: %d chunks", r["namespace"], r["chunks"])
        else:
            log.info("  %s: %d chunks upserted", r["namespace"], r["upserted"])


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Ingest WeHive v3 prompts doc sections into Pinecone.",
    )
    parser.add_argument(
        "--namespace",
        metavar="NS",
        help=(
            "Ingest only this namespace (e.g. wehive-exam-prep). "
            "Omit to ingest all v3 namespaces."
        ),
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=False,
        help="Parse and chunk without embedding or upserting.",
    )
    args = parser.parse_args()

    if not args.dry_run:
        for var in ("OPENAI_API_KEY", "PINECONE_API_KEY"):
            if not os.environ.get(var):
                log.error("Missing environment variable: %s", var)
                sys.exit(1)

    namespaces = [args.namespace] if args.namespace else None
    run(namespaces, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
