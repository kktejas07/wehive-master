"""Local Prompts Library — versioned, templated, file + Mongo backed.

A prompt is a versioned record with:
  - id            unique slug, e.g. "system.hive"
  - version       integer, monotonically increasing per id
  - description   short summary
  - tags          list[str]
  - variables     list[str] of {{ var }} placeholders used in system/user
  - system        system message template
  - user          user message template
  - created_at    ISO timestamp
  - updated_at    ISO timestamp

Storage strategy:
  1. YAML files in PROMPTS_DIR (default ./prompts) — checked in to git,
     act as the source of truth and ship with the app.
  2. MongoDB collection `prompts` — used for runtime overrides created
     via the admin UI. Mongo takes precedence over YAML when both exist
     for the same (id, version).

Resolution: get_prompt(id) returns the highest-version prompt that exists
for the given id. get_prompt(id, version=N) returns the exact version.

Rendering: render(prompt, variables) substitutes {{ var }} with values
from a dict. Missing variables raise ValueError.
"""

from __future__ import annotations

import logging
import os
import re
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger("wehive.prompts")

PROMPTS_DIR = os.environ.get("PROMPTS_DIR", "./prompts")
DEFAULT_VERSION = int(os.environ.get("PROMPTS_DEFAULT_VERSION", "1"))


@dataclass
class Prompt:
    id: str
    version: int
    description: str
    tags: list[str]
    variables: list[str]
    system: str
    user: str
    source: str = "yaml"
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    def to_dict(self) -> dict:
        d = asdict(self)
        return d


_VAR_RE = re.compile(r"\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}")


def _extract_vars(text: str) -> list[str]:
    seen: list[str] = []
    for m in _VAR_RE.findall(text or ""):
        if m not in seen:
            seen.append(m)
    return seen


def render(template: str, variables: dict[str, Any]) -> str:
    """Substitute {{ var }} placeholders. Raises ValueError on missing vars."""
    if not template:
        return ""

    def _sub(m: re.Match) -> str:
        name = m.group(1)
        if name not in variables:
            raise ValueError(f"Missing variable: {name}")
        return str(variables[name])

    return _VAR_RE.sub(_sub, template)


def render_prompt(prompt: Prompt, variables: dict[str, Any]) -> dict[str, str]:
    """Render both system and user messages; auto-discover missing variables."""
    missing: list[str] = []
    for needed in prompt.variables:
        if needed not in variables:
            missing.append(needed)
    declared = _extract_vars(prompt.system) + _extract_vars(prompt.user)
    for needed in declared:
        if needed not in variables:
            missing.append(needed)
    if missing:
        raise ValueError(f"Missing variables for prompt '{prompt.id}': {missing}")
    return {
        "system": render(prompt.system, variables),
        "user": render(prompt.user, variables),
    }


def _try_import_yaml() -> Optional[type]:
    try:
        import yaml  # type: ignore
        return yaml
    except Exception:
        return None


def _parse_prompt_doc(d: dict, source: str) -> Prompt:
    pid = str(d.get("id") or "").strip()
    if not pid:
        raise ValueError("Prompt doc missing 'id'")
    system = str(d.get("system") or "")
    user = str(d.get("user") or "")
    declared = list(d.get("variables") or [])
    for v in _extract_vars(system) + _extract_vars(user):
        if v not in declared:
            declared.append(v)
    return Prompt(
        id=pid,
        version=int(d.get("version") or DEFAULT_VERSION),
        description=str(d.get("description") or ""),
        tags=list(d.get("tags") or []),
        variables=declared,
        system=system,
        user=user,
        source=source,
        created_at=d.get("created_at"),
        updated_at=d.get("updated_at"),
    )


def _load_yaml_dir(path: str) -> list[Prompt]:
    out: list[Prompt] = []
    yaml = _try_import_yaml()
    p = Path(path)
    if not p.exists() or not p.is_dir():
        return out
    if yaml is None:
        for f in sorted(p.glob("*.yaml")):
            try:
                txt = f.read_text(encoding="utf-8")
                out.extend(_parse_yaml_fallback(txt, str(f)))
            except Exception as e:
                logger.warning("Failed to load prompt file %s: %s", f, e)
        return out
    for f in sorted(p.glob("*.yaml")):
        try:
            data = yaml.safe_load(f.read_text(encoding="utf-8"))
            if not data:
                continue
            if isinstance(data, list):
                for item in data:
                    if isinstance(item, dict):
                        out.append(_parse_prompt_doc(item, "yaml"))
            elif isinstance(data, dict):
                out.append(_parse_prompt_doc(data, "yaml"))
        except Exception as e:
            logger.warning("Failed to load prompt file %s: %s", f, e)
    return out


def _parse_yaml_fallback(txt: str, source: str) -> list[Prompt]:
    """Very small YAML reader for prompt files (no PyYAML)."""
    out: list[Prompt] = []
    blocks = re.split(r"\n---\n", txt)
    for block in blocks:
        block = block.strip()
        if not block:
            continue
        d: dict[str, Any] = {}
        current_list: Optional[list] = None
        list_key: Optional[str] = None
        for line in block.split("\n"):
            if not line.strip() or line.lstrip().startswith("#"):
                continue
            if line.startswith("  - ") and list_key is not None and current_list is not None:
                item_txt = line[4:].strip()
                if ":" in item_txt:
                    k, v = item_txt.split(":", 1)
                    item: dict = {k.strip(): _coerce(v.strip())}
                    current_list.append(item)
                continue
            if line.startswith("  - "):
                continue
            if ":" in line and not line.startswith(" "):
                k, v = line.split(":", 1)
                k = k.strip()
                v = v.strip()
                if v == "" or v == "|" or v == ">":
                    if v in ("|", ">"):
                        d[k] = ""
                        current_list = None
                        list_key = None
                    else:
                        current_list = []
                        d[k] = current_list
                        list_key = k
                else:
                    if v.startswith("[") and v.endswith("]"):
                        try:
                            d[k] = [_coerce(x.strip()) for x in v[1:-1].split(",") if x.strip()]
                        except Exception:
                            d[k] = v
                    else:
                        d[k] = _coerce(v)
                    current_list = None
                    list_key = None
        if d.get("id"):
            out.append(_parse_prompt_doc(d, source))
    return out


def _coerce(v: str) -> Any:
    if v.lower() in ("true", "yes"):
        return True
    if v.lower() in ("false", "no"):
        return False
    if v.lower() in ("null", "~"):
        return None
    if re.match(r"^-?\d+$", v):
        return int(v)
    if re.match(r"^-?\d+\.\d+$", v):
        return float(v)
    return v


class PromptStore:
    """In-process cache over YAML + Mongo. Mongo wins on conflict."""

    def __init__(self, prompts_dir: str = PROMPTS_DIR, db: Any = None):
        self.prompts_dir = prompts_dir
        self.db = db
        self._cache: dict[str, dict[int, Prompt]] = {}
        self._loaded = False

    def bind_db(self, db: Any) -> None:
        self.db = db
        self._loaded = False

    def _load(self) -> None:
        self._cache.clear()
        for p in _load_yaml_dir(self.prompts_dir):
            self._add(p)
        self._loaded = True

    async def _refresh_from_mongo(self) -> None:
        """Async helper: pull prompts from Mongo and merge into cache.

        Called by route handlers after writes. The sync `_load` is used
        for the initial YAML-only seed at startup.
        """
        if self.db is None:
            return
        try:
            coll = self.db["prompts"]
            async for d in coll.find({}, {"_id": 0}):
                try:
                    self._add(_parse_prompt_doc(d, "mongo"))
                except Exception as e:
                    logger.warning("Bad mongo prompt: %s", e)
        except Exception as e:
            logger.warning("Could not load mongo prompts: %s", e)

    def _add(self, p: Prompt) -> None:
        self._cache.setdefault(p.id, {})[p.version] = p

    def reload(self) -> None:
        self._loaded = False
        self._load()

    def all_versions(self, prompt_id: str) -> list[Prompt]:
        if not self._loaded:
            self._load()
        return sorted(self._cache.get(prompt_id, {}).values(), key=lambda x: x.version)

    def latest(self, prompt_id: str) -> Optional[Prompt]:
        versions = self.all_versions(prompt_id)
        return versions[-1] if versions else None

    def get(self, prompt_id: str, version: Optional[int] = None) -> Optional[Prompt]:
        if not self._loaded:
            self._load()
        versions = self._cache.get(prompt_id, {})
        if not versions:
            return None
        if version is None:
            return versions[max(versions.keys())]
        return versions.get(version)

    def list(self) -> list[dict]:
        if not self._loaded:
            self._load()
        out: list[dict] = []
        for pid in sorted(self._cache.keys()):
            latest = self.latest(pid)
            if latest:
                out.append({
                    "id": latest.id,
                    "version": latest.version,
                    "description": latest.description,
                    "tags": latest.tags,
                    "variables": latest.variables,
                    "source": latest.source,
                })
        return out

    async def save(self, prompt: Prompt) -> Prompt:
        if not prompt.id:
            raise ValueError("Prompt id required")
        existing = self.all_versions(prompt.id)
        if not prompt.version or prompt.version < 1:
            prompt.version = (existing[-1].version + 1) if existing else 1
        now = datetime.utcnow().isoformat()
        if not prompt.created_at:
            prompt.created_at = now
        prompt.updated_at = now
        prompt.source = "mongo"
        if self.db is not None:
            coll = self.db["prompts"]
            doc = prompt.to_dict()
            await coll.update_one(
                {"id": prompt.id, "version": prompt.version},
                {"$set": doc},
                upsert=True,
            )
        self._add(prompt)
        return prompt

    async def delete(self, prompt_id: str, version: Optional[int] = None) -> int:
        if not self._loaded:
            self._load()
        removed = 0
        if version is None:
            versions = list(self._cache.get(prompt_id, {}).keys())
        else:
            versions = [version]
        if self.db is not None:
            coll = self.db["prompts"]
            q: dict[str, Any] = {"id": prompt_id}
            if version is not None:
                q["version"] = version
            res = await coll.delete_many(q)
            removed = res.deleted_count or 0
        for v in versions:
            if self._cache.get(prompt_id, {}).pop(v, None) is not None:
                if removed == 0:
                    removed += 1
        if not self._cache.get(prompt_id):
            self._cache.pop(prompt_id, None)
        return removed


_store: Optional[PromptStore] = None


def get_store(db: Any = None) -> PromptStore:
    global _store
    if _store is None:
        _store = PromptStore(prompts_dir=PROMPTS_DIR, db=db)
    elif db is not None and _store.db is None:
        _store.bind_db(db)
    return _store


def reset_store() -> None:
    global _store
    _store = None
