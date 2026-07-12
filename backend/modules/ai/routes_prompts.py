"""Prompts API — list / read / create / version / delete prompt templates.

Public (auth required):
  GET  /api/prompts                 list all latest prompts
  GET  /api/prompts/{id}            get a specific version (or latest)
  GET  /api/prompts/{id}/versions   list all versions of a prompt

Admin only:
  POST /api/prompts                 create or update a prompt
  POST /api/prompts/{id}/render     render a prompt with variables
  DELETE /api/prompts/{id}          delete a specific version (or all)
  POST /api/prompts/reload          reload YAML + Mongo into in-memory cache
"""

from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.auth_utils import get_current_user
from core.admin_auth import get_current_admin_flex
from core.db import db
from shared.prompts_lib import (
    Prompt,
    PromptStore,
    get_store,
    render_prompt,
)

logger = logging.getLogger("wehive.routes_prompts")

router = APIRouter(prefix="/prompts", tags=["prompts"])


class CreatePromptRequest(BaseModel):
    id: str
    version: Optional[int] = None
    description: str = ""
    tags: Optional[List[str]] = None
    variables: Optional[List[str]] = None
    system: str
    user: str


class RenderRequest(BaseModel):
    id: str
    version: Optional[int] = None
    variables: dict = {}


def _store() -> PromptStore:
    return get_store(db)


@router.get("")
async def list_prompts(user=Depends(get_current_user)):
    """List all latest prompts."""
    s = _store()
    await s._refresh_from_mongo()
    return {"ok": True, "prompts": s.list()}


@router.get("/{prompt_id}")
async def get_prompt(prompt_id: str, version: Optional[int] = None, user=Depends(get_current_user)):
    """Get a prompt by id (and optional version)."""
    s = _store()
    await s._refresh_from_mongo()
    p = s.get(prompt_id, version=version)
    if not p:
        raise HTTPException(404, f"Prompt not found: {prompt_id}")
    return {"ok": True, "prompt": p.to_dict()}


@router.get("/{prompt_id}/versions")
async def get_prompt_versions(prompt_id: str, user=Depends(get_current_user)):
    """List all versions of a prompt."""
    s = _store()
    await s._refresh_from_mongo()
    versions = s.all_versions(prompt_id)
    if not versions:
        raise HTTPException(404, f"Prompt not found: {prompt_id}")
    return {"ok": True, "versions": [p.to_dict() for p in versions]}


@router.post("")
async def create_prompt(req: CreatePromptRequest, _=Depends(get_current_admin_flex)):
    """Create or update a prompt. Bumps the version automatically if absent."""
    s = _store()
    p = Prompt(
        id=req.id,
        version=req.version or 0,
        description=req.description,
        tags=list(req.tags or []),
        variables=list(req.variables or []),
        system=req.system,
        user=req.user,
    )
    try:
        saved = await s.save(p)
    except Exception as e:
        logger.exception("Failed to save prompt: %s", e)
        raise HTTPException(500, f"Save failed: {e}")
    return {"ok": True, "prompt": saved.to_dict()}


@router.post("/{prompt_id}/render")
async def render_prompt_endpoint(
    prompt_id: str, req: RenderRequest, user=Depends(get_current_user)
):
    """Render a prompt with provided variables — returns the final messages."""
    s = _store()
    await s._refresh_from_mongo()
    p = s.get(req.id or prompt_id, version=req.version)
    if not p:
        raise HTTPException(404, f"Prompt not found: {req.id or prompt_id}")
    try:
        rendered = render_prompt(p, req.variables)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {
        "ok": True,
        "id": p.id,
        "version": p.version,
        "system": rendered["system"],
        "user": rendered["user"],
    }


@router.delete("/{prompt_id}")
async def delete_prompt(
    prompt_id: str, version: Optional[int] = None, _=Depends(get_current_admin_flex)
):
    """Delete one version (or all versions) of a prompt."""
    s = _store()
    removed = await s.delete(prompt_id, version=version)
    if removed == 0:
        raise HTTPException(404, f"Prompt not found: {prompt_id}")
    return {"ok": True, "deleted": removed, "id": prompt_id, "version": version}


@router.post("/reload")
async def reload_prompts(_=Depends(get_current_admin_flex)):
    """Force-reload prompts from YAML + Mongo."""
    s = _store()
    s.reload()
    await s._refresh_from_mongo()
    return {"ok": True, "count": len(s.list())}
