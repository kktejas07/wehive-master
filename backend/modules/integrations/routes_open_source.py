"""Open Source AI Resources — Manage and discover open-source AI tools,
models, and integrations available to the platform.

Endpoints:
  GET  /api/opensource/tools       — List available open-source AI tools
  GET  /api/opensource/models      — List open-source models by category
  GET  /api/opensource/github      — Search GitHub for AI projects
  GET  /api/opensource/status      — Check availability of open-source services
"""

import os
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends

from core.auth_utils import get_current_user_optional

router = APIRouter(prefix="/opensource", tags=["open-source"])

OPEN_SOURCE_TOOLS = [
    {
        "id": "ollama",
        "name": "Ollama",
        "description": "Run large language models locally. Supports Llama 3.2, Mistral, Gemma, Phi, and more.",
        "category": "llm-runtime",
        "url": "https://ollama.ai",
        "github": "https://github.com/ollama/ollama",
        "license": "MIT",
        "language": "Go",
        "stars": "100k+",
        "integrated": True,
        "setup_required": True,
        "free": True,
    },
    {
        "id": "chromadb",
        "name": "ChromaDB",
        "description": "Open-source embedding database for AI applications. Powers our RAG pipeline.",
        "category": "vector-db",
        "url": "https://www.trychroma.com",
        "github": "https://github.com/chroma-core/chroma",
        "license": "Apache 2.0",
        "language": "Python",
        "stars": "15k+",
        "integrated": True,
        "setup_required": False,
        "free": True,
    },
    {
        "id": "litellm",
        "name": "LiteLLM",
        "description": "Call 100+ LLM APIs using the OpenAI format. Multi-provider routing with load balancing.",
        "category": "llm-proxy",
        "url": "https://litellm.ai",
        "github": "https://github.com/BerriAI/litellm",
        "license": "MIT",
        "language": "Python",
        "stars": "15k+",
        "integrated": True,
        "setup_required": False,
        "free": True,
    },
    {
        "id": "llamacpp",
        "name": "llama.cpp",
        "description": "LLM inference in C/C++. Run quantized models (GGUF) on CPU with excellent performance.",
        "category": "llm-runtime",
        "url": "https://github.com/ggerganov/llama.cpp",
        "github": "https://github.com/ggerganov/llama.cpp",
        "license": "MIT",
        "language": "C++",
        "stars": "70k+",
        "integrated": True,
        "setup_required": True,
        "free": True,
    },
    {
        "id": "langchain",
        "name": "LangChain",
        "description": "Framework for building LLM-powered applications. Chains, agents, retrieval, and tool integration.",
        "category": "framework",
        "url": "https://www.langchain.com",
        "github": "https://github.com/langchain-ai/langchain",
        "license": "MIT",
        "language": "Python",
        "stars": "95k+",
        "integrated": False,
        "setup_required": True,
        "free": True,
    },
    {
        "id": "huggingface-transformers",
        "name": "Hugging Face Transformers",
        "description": "State-of-the-art machine learning for text, vision, and audio. Thousands of pre-trained models.",
        "category": "ml-framework",
        "url": "https://huggingface.co",
        "github": "https://github.com/huggingface/transformers",
        "license": "Apache 2.0",
        "language": "Python",
        "stars": "130k+",
        "integrated": False,
        "setup_required": True,
        "free": True,
    },
    {
        "id": "gpt4all",
        "name": "GPT4All",
        "description": "Run open-source LLMs locally on consumer hardware. Desktop app + Python bindings.",
        "category": "llm-runtime",
        "url": "https://gpt4all.io",
        "github": "https://github.com/nomic-ai/gpt4all",
        "license": "MIT",
        "language": "C++/Python",
        "stars": "70k+",
        "integrated": True,
        "setup_required": True,
        "free": True,
    },
    {
        "id": "sentence-transformers",
        "name": "Sentence Transformers",
        "description": "Compute dense vector representations for sentences, paragraphs, and images. Semantic search.",
        "category": "embeddings",
        "url": "https://www.sbert.net",
        "github": "https://github.com/UKPLab/sentence-transformers",
        "license": "Apache 2.0",
        "language": "Python",
        "stars": "15k+",
        "integrated": True,
        "setup_required": True,
        "free": True,
    },
    {
        "id": "whisper",
        "name": "OpenAI Whisper",
        "description": "General-purpose speech recognition model. Multilingual, robust to noise, accents, and technical language.",
        "category": "speech",
        "url": "https://github.com/openai/whisper",
        "github": "https://github.com/openai/whisper",
        "license": "MIT",
        "language": "Python",
        "stars": "70k+",
        "integrated": False,
        "setup_required": True,
        "free": True,
    },
    {
        "id": "stable-diffusion",
        "name": "Stable Diffusion",
        "description": "Open-source text-to-image generation model. Create images from text descriptions locally.",
        "category": "image-gen",
        "url": "https://stability.ai",
        "github": "https://github.com/Stability-AI/stablediffusion",
        "license": "RAIL-M",
        "language": "Python",
        "stars": "40k+",
        "integrated": False,
        "setup_required": True,
        "free": True,
    },
    {
        "id": "crewai",
        "name": "CrewAI",
        "description": "Framework for orchestrating role-playing autonomous AI agents. Multi-agent collaboration.",
        "category": "agent-framework",
        "url": "https://www.crewai.com",
        "github": "https://github.com/crewAIInc/crewAI",
        "license": "MIT",
        "language": "Python",
        "stars": "20k+",
        "integrated": False,
        "setup_required": True,
        "free": True,
    },
    {
        "id": "autogen",
        "name": "Microsoft AutoGen",
        "description": "Multi-agent conversation framework. Enables complex agent interactions and workflows.",
        "category": "agent-framework",
        "url": "https://microsoft.github.io/autogen",
        "github": "https://github.com/microsoft/autogen",
        "license": "MIT",
        "language": "Python",
        "stars": "35k+",
        "integrated": False,
        "setup_required": True,
        "free": True,
    },
    {
        "id": "vllm",
        "name": "vLLM",
        "description": "High-throughput LLM serving with PagedAttention. Optimized for production inference.",
        "category": "llm-serving",
        "url": "https://vllm.ai",
        "github": "https://github.com/vllm-project/vllm",
        "license": "Apache 2.0",
        "language": "Python",
        "stars": "40k+",
        "integrated": False,
        "setup_required": True,
        "free": True,
    },
    {
        "id": "playwright",
        "name": "Playwright",
        "description": "Cross-browser automation library. Used for web scraping, testing, and monitoring US visa slots.",
        "category": "automation",
        "url": "https://playwright.dev",
        "github": "https://github.com/microsoft/playwright",
        "license": "Apache 2.0",
        "language": "TypeScript/Python",
        "stars": "65k+",
        "integrated": True,
        "setup_required": True,
        "free": True,
    },
    {
        "id": "selenium",
        "name": "Selenium WebDriver",
        "description": "Browser automation framework. Alternative to Playwright for web scraping and testing.",
        "category": "automation",
        "url": "https://www.selenium.dev",
        "github": "https://github.com/SeleniumHQ/selenium",
        "license": "Apache 2.0",
        "language": "Java/Python",
        "stars": "30k+",
        "integrated": False,
        "setup_required": True,
        "free": True,
    },
]

OPEN_SOURCE_MODELS = [
    {
        "id": "llama-3.2-3b",
        "name": "Llama 3.2 3B",
        "provider": "Meta",
        "type": "text",
        "size": "3B params",
        "context": "128K",
        "license": "Llama 3.2 Community",
        "best_for": "Local inference on consumer hardware",
    },
    {
        "id": "llama-3.2-70b",
        "name": "Llama 3.2 70B",
        "provider": "Meta",
        "type": "text",
        "size": "70B params",
        "context": "128K",
        "license": "Llama 3.2 Community",
        "best_for": "High-quality text generation",
    },
    {
        "id": "mistral-7b",
        "name": "Mistral 7B",
        "provider": "Mistral AI",
        "type": "text",
        "size": "7B params",
        "context": "32K",
        "license": "Apache 2.0",
        "best_for": "Fast, efficient local inference",
    },
    {
        "id": "gemma2-9b",
        "name": "Gemma 2 9B",
        "provider": "Google",
        "type": "text",
        "size": "9B params",
        "context": "8K",
        "license": "Gemma",
        "best_for": "General purpose with strong reasoning",
    },
    {
        "id": "deepseek-v3",
        "name": "DeepSeek V3",
        "provider": "DeepSeek",
        "type": "text",
        "size": "671B MoE",
        "context": "128K",
        "license": "DeepSeek",
        "best_for": "Code generation, complex reasoning",
    },
    {
        "id": "phi-4",
        "name": "Phi-4",
        "provider": "Microsoft",
        "type": "text",
        "size": "14B params",
        "context": "16K",
        "license": "MIT",
        "best_for": "Reasoning and math on modest hardware",
    },
    {
        "id": "nomic-embed-text",
        "name": "Nomic Embed Text",
        "provider": "Nomic AI",
        "type": "embedding",
        "size": "137M params",
        "context": "8K",
        "license": "Apache 2.0",
        "best_for": "Text embeddings for RAG",
    },
    {
        "id": "all-minilm-l6-v2",
        "name": "all-MiniLM-L6-v2",
        "provider": "sentence-transformers",
        "type": "embedding",
        "size": "22M params",
        "context": "256 tokens",
        "license": "Apache 2.0",
        "best_for": "Lightweight semantic search",
    },
]


@router.get("/tools")
async def list_open_source_tools(
    category: Optional[str] = None,
    integrated_only: bool = False,
    free_only: bool = False,
):
    results = list(OPEN_SOURCE_TOOLS)
    if category:
        results = [t for t in results if t["category"] == category]
    if integrated_only:
        results = [t for t in results if t["integrated"]]
    if free_only:
        results = [t for t in results if t["free"]]
    return {"ok": True, "count": len(results), "tools": results}


@router.get("/models")
async def list_open_source_models(
    type: Optional[str] = None,
):
    results = list(OPEN_SOURCE_MODELS)
    if type:
        results = [m for m in results if m["type"] == type]
    return {"ok": True, "count": len(results), "models": results}


@router.get("/github")
async def search_github_projects(
    q: str,
    user=Depends(get_current_user_optional),
):
    import httpx

    github_token = os.environ.get("GITHUB_TOKEN", "")
    headers = {"Accept": "application/vnd.github.v3+json"}
    if github_token:
        headers["Authorization"] = f"Bearer {github_token}"

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://api.github.com/search/repositories",
                params={"q": q, "sort": "stars", "order": "desc", "per_page": 10},
                headers=headers,
            )
            if resp.status_code == 200:
                data = resp.json()
                repos = [
                    {
                        "full_name": r["full_name"],
                        "description": r.get("description", ""),
                        "stars": r.get("stargazers_count", 0),
                        "language": r.get("language", ""),
                        "url": r.get("html_url", ""),
                        "license": (r.get("license") or {}).get("spdx_id", ""),
                    }
                    for r in data.get("items", [])[:10]
                ]
                return {"ok": True, "query": q, "count": len(repos), "repos": repos}
            return {"ok": True, "query": q, "count": 0, "repos": [], "note": "GitHub API rate limited"}
    except Exception as e:
        return {"ok": False, "detail": str(e)}


@router.get("/status")
async def open_source_status():
    ollama_ok = False
    chroma_ok = False

    try:
        import httpx
        async with httpx.AsyncClient(timeout=3) as client:
            ollama_resp = await client.get("http://localhost:11434/api/tags")
            ollama_ok = ollama_resp.status_code == 200
    except Exception:
        pass

    try:
        from shared.vector_store import _client
        chroma_ok = _client is not None
    except Exception:
        pass

    return {
        "ok": True,
        "ollama": {"running": ollama_ok, "endpoint": "http://localhost:11434"},
        "chromadb": {"available": chroma_ok},
        "integrated_tools": sum(1 for t in OPEN_SOURCE_TOOLS if t["integrated"]),
        "available_tools": len(OPEN_SOURCE_TOOLS),
        "checked_at": datetime.utcnow().isoformat(),
    }
