"""Model Router + BYOK Vault + MCP Runtime API routes."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth_utils import get_current_user

router = APIRouter(prefix="/models", tags=["models"])


class ChatWithProfileRequest(BaseModel):
    profile_id: str
    messages: list[dict]
    max_tokens: int = 1024
    temperature: float = None


class BYOKStoreRequest(BaseModel):
    provider_id: str
    api_key: str


@router.get("/profiles")
async def list_model_profiles():
    from model_router import list_profiles as lp
    return {"ok": True, "profiles": lp()}


@router.get("/profiles/{profile_id}")
async def get_model_profile(profile_id: str):
    from model_router import get_profile
    profile = get_profile(profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"ok": True, "profile": {"id": profile_id, **profile}}


@router.post("/chat")
async def chat_with_profile(req: ChatWithProfileRequest):
    from model_router import chat_with_profile as cwp
    result = await cwp(req.profile_id, req.messages, req.max_tokens, req.temperature)
    if "error" in result:
        raise HTTPException(status_code=502, detail=result["error"])
    return result


@router.get("/circuit-breaker")
async def circuit_breaker_status():
    from model_router import circuit_breaker_status as cbs
    return {"ok": True, **cbs()}


@router.get("/byok/providers")
async def byok_providers():
    from byok_vault import providers_accepting_byok
    return {"ok": True, "providers": providers_accepting_byok()}


@router.post("/byok/store")
async def byok_store(req: BYOKStoreRequest, user=Depends(get_current_user)):
    from byok_vault import store_key
    ok = await store_key(user["_id"], req.provider_id, req.api_key)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to encrypt and store key")
    return {"ok": True, "message": f"API key for {req.provider_id} stored securely"}


@router.get("/byok/keys")
async def byok_list_keys(user=Depends(get_current_user)):
    from byok_vault import list_user_keys
    keys = await list_user_keys(user["_id"])
    return {"ok": True, "keys": keys}


@router.delete("/byok/keys/{provider_id}")
async def byok_delete_key(provider_id: str, user=Depends(get_current_user)):
    from byok_vault import delete_key
    await delete_key(user["_id"], provider_id)
    return {"ok": True, "message": f"Key for {provider_id} deleted"}


@router.post("/mcp/handle")
async def mcp_handle(request: dict):
    """Handle a JSON-RPC 2.0 MCP request."""
    from mcp.runtime import handle_mcp_request

    method = request.get("method", "")
    params = request.get("params")
    req_id = request.get("id")

    if not method:
        raise HTTPException(status_code=400, detail="Missing method")

    result = await handle_mcp_request(method, params, req_id)
    if result is None:
        return {}
    return result


@router.get("/mcp/tools")
async def mcp_list_tools():
    from mcp.runtime import list_tools as mcp_tools
    return {"ok": True, "tools": mcp_tools()}


@router.get("/mcp/status")
async def mcp_runtime_status():
    from mcp.runtime import TOOLS, RESOURCES, PROMPTS
    return {
        "ok": True,
        "protocol": "2024-11-05",
        "tools_count": len(TOOLS),
        "resources_count": len(RESOURCES),
        "prompts_count": len(PROMPTS),
        "checked_at": datetime.utcnow().isoformat(),
    }
