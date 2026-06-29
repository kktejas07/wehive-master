"""MCP (Model Context Protocol) Management — Configure and manage
external MCP servers, tools, and configurations.

Endpoints:
  GET  /api/mcp/servers           List all 24 MCP servers
  GET  /api/mcp/servers/{slug}    Get server details
  POST /api/mcp/config            Save MCP configuration
  GET  /api/mcp/config            Get current MCP configuration
  GET  /api/mcp/status            MCP health check
  GET  /api/mcp/plugins           List available plugins (27 with sync handlers)
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth_utils import get_current_user
from db import db

router = APIRouter(prefix="/mcp", tags=["mcp"])

MCP_SERVERS = [
    {"slug": "figma", "name": "Figma", "category": "Design & UX",
     "description": "Access Figma design files, components, and prototypes", "free": True},
    {"slug": "github", "name": "GitHub", "category": "DevOps",
     "description": "Repository management, issues, PRs, and code search", "free": True},
    {"slug": "supabase", "name": "Supabase", "category": "Database",
     "description": "PostgreSQL database, auth, and storage management", "free": True},
    {"slug": "brave-search", "name": "Brave Search", "category": "Search",
     "description": "Privacy-focused web search with AI summaries. Free tier: 2K queries/month.", "free": True,
     "install": "npx @brave/brave-search-mcp", "env_var": "BRAVE_SEARCH_API_KEY",
     "docs": "https://brave.com/search/api/", "github": "https://github.com/brave/brave-search-mcp-server",
     "integrated": True},
    {"slug": "tavily", "name": "Tavily", "category": "Search",
     "description": "AI-optimized search API for RAG and agents", "free": True},
    {"slug": "firecrawl", "name": "Firecrawl", "category": "Search",
     "description": "Web scraping and crawling for LLM-ready content", "free": True},
    {"slug": "serper", "name": "Serper", "category": "Search",
     "description": "Google Search API for LLMs", "free": False},
    {"slug": "searxng", "name": "SearXNG", "category": "Search",
     "description": "Self-hosted meta-search engine", "free": True},
    {"slug": "jina-reader", "name": "Jina AI Reader", "category": "Search",
     "description": "Convert any URL to LLM-friendly markdown", "free": True},
    {"slug": "exa", "name": "Exa", "category": "Search",
     "description": "Semantic search engine for AI applications", "free": False},
    {"slug": "notion", "name": "Notion", "category": "Productivity",
     "description": "Knowledge base, wiki, and project management", "free": True},
    {"slug": "slack", "name": "Slack", "category": "Communication",
     "description": "Team messaging, channels, and file sharing", "free": True},
    {"slug": "ollama-mcp", "name": "Ollama Bridge", "category": "AI",
     "description": "Bridge Ollama local models into MCP ecosystem", "free": True},
    {"slug": "funasr", "name": "FunASR", "category": "Speech",
     "description": "End-to-end speech recognition toolkit", "free": True},
    {"slug": "huggingface-mcp", "name": "HuggingFace", "category": "AI",
     "description": "Access HuggingFace models, datasets, and spaces", "free": True},
    {"slug": "cognee", "name": "Cognee", "category": "Memory",
     "description": "Agent memory and knowledge graph construction", "free": True},
    {"slug": "graphiti", "name": "Graphiti", "category": "Knowledge Graph",
     "description": "Temporal knowledge graph for entity relationships", "free": True},
    {"slug": "minthcm", "name": "MintHCM", "category": "HR",
     "description": "Open-source HR management system", "free": True},
    {"slug": "rchilli", "name": "RChilli", "category": "HR/Resume",
     "description": "AI-powered resume parsing and candidate matching", "free": False},
    {"slug": "hr-agent", "name": "HR Agent", "category": "HR/Policy",
     "description": "HR policy agent for compliance and employee queries", "free": True},
    {"slug": "gpt-researcher", "name": "GPT Researcher", "category": "Research",
     "description": "Autonomous multi-step research agent", "free": True},
    {"slug": "pseudonym", "name": "Pseudonym", "category": "Privacy",
     "description": "Data pseudonymization and anonymization", "free": True},
    {"slug": "google-kg", "name": "Google Knowledge Graph", "category": "Research",
     "description": "Structured entity data from Google Knowledge Graph", "free": False},
    {"slug": "bias-detector", "name": "Bias Detector", "category": "Compliance",
     "description": "Detect and mitigate bias in AI outputs and hiring", "free": True},
]

PLUGINS = [
    {"name": "Filesystem", "category": "MCP Official", "handlers": "read,write,list,delete"},
    {"name": "Fetch", "category": "MCP Official", "handlers": "fetch_url,fetch_json"},
    {"name": "Memory", "category": "MCP Official", "handlers": "store,recall,forget,search"},
    {"name": "Git", "category": "MCP Official", "handlers": "status,commit,push,pull"},
    {"name": "Sequential Thinking", "category": "MCP Official", "handlers": "think,revise,branch"},
    {"name": "Time", "category": "MCP Official", "handlers": "current,convert,timezone"},
    {"name": "PostgreSQL", "category": "MCP Official", "handlers": "query,execute,describe"},
    {"name": "Firecrawl", "category": "Scrapers", "handlers": "scrape,crawl,map,search"},
    {"name": "Browserbase", "category": "Scrapers", "handlers": "navigate,click,extract,screenshot"},
    {"name": "Tavily", "category": "Scrapers", "handlers": "search,extract"},
    {"name": "Exa", "category": "Scrapers", "handlers": "search,similar,contents"},
    {"name": "Jina", "category": "Scrapers", "handlers": "read,search,ground"},
    {"name": "Context7", "category": "Scrapers", "handlers": "resolve,query"},
    {"name": "Serper", "category": "Scrapers", "handlers": "search,news,images"},
    {"name": "Bright Data", "category": "Scrapers", "handlers": "unlock,extract,serp"},
    {"name": "Slack", "category": "Communication", "handlers": "send,read,list_channels"},
    {"name": "Teams", "category": "Communication", "handlers": "send,list,create_meeting"},
    {"name": "WhatsApp", "category": "Communication", "handlers": "send,template,media"},
    {"name": "GitHub", "category": "Dev Tools", "handlers": "repo,issue,pr,search,actions"},
    {"name": "GitLab", "category": "Dev Tools", "handlers": "repo,merge,ci,pipeline"},
    {"name": "Jira", "category": "Dev Tools", "handlers": "issue,project,sprint,search"},
    {"name": "Sentry", "category": "Dev Tools", "handlers": "issues,events,projects"},
    {"name": "Docker", "category": "Dev Tools", "handlers": "ps,logs,restart,inspect"},
    {"name": "TrendRadar", "category": "Market", "handlers": "scan,alert,report"},
    {"name": "Cognee", "category": "AI Memory", "handlers": "add,cognify,search,forget"},
    {"name": "Graphiti", "category": "AI Memory", "handlers": "add_episode,search,get_entity"},
    {"name": "GPT Researcher", "category": "AI Memory", "handlers": "research,report,deep_dive"},
]


class MCPConfigRequest(BaseModel):
    servers: dict = {}
    default_server: Optional[str] = None
    auto_connect: bool = True


@router.get("/servers")
async def list_mcp_servers(category: Optional[str] = None):
    results = MCP_SERVERS
    if category:
        results = [s for s in results if s["category"].lower() == category.lower()]
    return {"ok": True, "total": len(results), "servers": results}


@router.get("/servers/{slug}")
async def get_mcp_server(slug: str):
    for s in MCP_SERVERS:
        if s["slug"] == slug:
            return {"ok": True, "server": s}
    raise HTTPException(status_code=404, detail="MCP server not found")


@router.post("/config")
async def save_mcp_config(req: MCPConfigRequest, user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    await db["mcp_configs"].update_one(
        {"user_id": user["_id"]},
        {"$set": {
            "user_id": user["_id"],
            "servers": req.servers,
            "default_server": req.default_server,
            "auto_connect": req.auto_connect,
            "updated_at": datetime.utcnow(),
        }},
        upsert=True,
    )
    return {"ok": True, "message": "MCP configuration saved"}


@router.get("/config")
async def get_mcp_config(user=Depends(get_current_user)):
    config = await db["mcp_configs"].find_one({"user_id": user["_id"]})
    if not config:
        return {"ok": True, "configured": False, "servers": {}}
    return {
        "ok": True, "configured": True,
        "servers": config.get("servers", {}),
        "default_server": config.get("default_server"),
        "auto_connect": config.get("auto_connect", True),
        "updated_at": str(config.get("updated_at", "")),
    }


@router.get("/status")
async def mcp_status():
    configured_count = await db["mcp_configs"].count_documents({})
    return {
        "ok": True,
        "available_servers": len(MCP_SERVERS),
        "available_plugins": len(PLUGINS),
        "configured_users": configured_count,
        "checked_at": datetime.utcnow().isoformat(),
    }


@router.get("/plugins")
async def list_plugins(category: Optional[str] = None):
    results = PLUGINS
    if category:
        results = [p for p in results if p["category"].lower() == category.lower()]
    return {"ok": True, "total": len(results), "plugins": results}
