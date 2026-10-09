"""Model Router + BYOK Vault + MCP Runtime API routes."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from admin_auth import get_current_admin_flex
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


class OrchestratorAccountRequest(BaseModel):
    provider: str
    api_key: str
    account_email: str = ""
    tokens_allocated: int = 0
    refresh_date: str = ""  # YYYY-MM-DD
    status: str = "ACTIVE"
    priority: int = 10
    models: list[str] = Field(default_factory=list)
    base_url: str = ""
    free_tier: bool = False
    capabilities: list[str] = Field(default_factory=lambda: ["llm"])
    extra_headers: dict = Field(default_factory=dict)


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
async def chat_with_profile(req: ChatWithProfileRequest, user=Depends(get_current_user)):
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
async def mcp_handle(request: dict, _admin=Depends(get_current_admin_flex)):
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


# ── Orchestrator admin routes ───────────────────────────────────────────────


@router.get("/accounts")
async def list_orchestrator_accounts(user=Depends(get_current_user)):
    from orchestrator.vault import AccountsVault

    vault = AccountsVault()
    accounts = await vault.list_accounts()
    for acct in accounts:
        acct.pop("api_key", None)
    return {"ok": True, "accounts": accounts}


@router.post("/accounts")
async def upsert_orchestrator_account(req: OrchestratorAccountRequest, user=Depends(get_current_user)):
    from orchestrator.vault import AccountsVault

    vault = AccountsVault()
    stored = await vault.set_account(req.model_dump())
    stored.pop("api_key", None)
    return {"ok": True, "account": stored}


@router.delete("/accounts/{provider_id}")
async def delete_orchestrator_account(provider_id: str, user=Depends(get_current_user)):
    from orchestrator.vault import AccountsVault

    vault = AccountsVault()
    deleted = await vault.delete_account(provider_id)
    return {"ok": True, "deleted": deleted}


@router.get("/budgets")
async def get_budget_status(user=Depends(get_current_user)):
    from orchestrator.budget import BudgetEnforcer

    enforcer = BudgetEnforcer()
    alerts = await enforcer.get_budget_alerts()
    return {"ok": True, "budgets": alerts}


@router.post("/budgets/check")
async def check_budgets(user=Depends(get_current_user)):
    from orchestrator.budget import BudgetEnforcer
    from orchestrator.token_pool import TokenPoolManager

    enforcer = BudgetEnforcer(token_pool=TokenPoolManager())
    alerts = await enforcer.check_and_enforce()
    return {"ok": True, "alerts": alerts}


@router.post("/budgets/refresh")
async def refresh_budget_accounts(user=Depends(get_current_user)):
    from orchestrator.budget import BudgetEnforcer
    from orchestrator.token_pool import TokenPoolManager

    enforcer = BudgetEnforcer(token_pool=TokenPoolManager())
    refreshed = await enforcer.refresh_due_accounts()
    return {"ok": True, "refreshed": refreshed}


@router.get("/usage")
async def get_usage_stats(days: int = Query(30, ge=1, le=365), user=Depends(get_current_user)):
    from orchestrator.token_pool import TokenPoolManager

    stats = await TokenPoolManager().get_usage_stats(days=days)
    return {"ok": True, "stats": stats}


@router.get("/usage/log")
async def get_usage_log(limit: int = Query(100, ge=1, le=500), user=Depends(get_current_user)):
    from orchestrator.token_pool import TokenPoolManager

    log = await TokenPoolManager().get_audit_log(limit=limit)
    return {"ok": True, "log": log}
