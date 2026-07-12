"""Model Router — Curated model profiles with automatic provider selection,
circuit breaker failover, and quality tier routing.

30 curated profiles mapping to specific provider/models based on Hyra's tested configs.

Profiles:
  fast_cheap          → Groq gpt-oss-20b (free, fastest)
  balanced            → Groq qwen-3.6-27b or Claude Sonnet 4
  balanced_anthropic  → Anthropic Claude Sonnet 4
  deep_reason         → Anthropic Claude Opus 4
  reasoning_oss       → Groq gpt-oss-120b (free)
  local_private       → Ollama (never leaves server)
  embeddings          → Ollama nomic-embed-text
  transcription       → Groq whisper-large-v3-turbo
  openai_gpt4o        → OpenAI GPT-4o
  openai_gpt4o_mini   → OpenAI GPT-4o Mini
  google_gemini_flash → Google Gemini 2.0 Flash
  google_gemini_pro   → Google Gemini 2.5 Pro
  deepseek_chat       → DeepSeek Chat
  deepseek_reasoner   → DeepSeek Reasoner
  cohere_command_r    → Cohere Command R+
  xai_grok            → xAI Grok 3 Beta
  perplexity_sonar    → Perplexity Sonar Pro
  mistral_large       → Mistral Large
  bedrock_claude      → AWS Bedrock Claude 3.5 Sonnet v2
  azure_gpt4o         → Azure OpenAI GPT-4o
  nim_llama_70b       → NVIDIA NIM Llama 3.1 70B
  nim_nemotron        → NVIDIA NIM Nemotron 4 340B
  local_llama3.2      → Ollama Llama 3.2
  local_qwen2.5       → Ollama Qwen 2.5 72B
  local_mistral        → Ollama Mistral
  local_deepseek_r1   → Ollama DeepSeek R1
  local_gemma2        → Ollama Gemma 2 9B
  hf_mistral          → HuggingFace Mistral 7B
  omni_free_fast      → OmniRoute (free)
  omni_free_balanced  → OmniRoute (free)
  omni_free_reasoning → OmniRoute (free)
"""

import logging
import time
import uuid
from enum import Enum
from typing import Optional

import httpx

from orchestrator.budget import BudgetEnforcer
from orchestrator.failover import CircuitBreaker, FailoverRouter
from orchestrator.pricing import calculate_cost, estimate_tokens
from orchestrator.token_pool import TokenPoolManager
from orchestrator.vault import AccountsVault, PROVIDER_BASE_URLS

logger = logging.getLogger("wehive.model_router")


class QualityTier(str, Enum):
    FAST = "fast"
    BALANCED = "balanced"
    BEST = "best"


MODEL_PROFILES = {
    "fast_cheap": {
        "provider": "groq",
        "model": "gpt-oss-20b",
        "tier": QualityTier.FAST,
        "token_multiplier": 1.0,
        "description": "Fastest free model — Groq's open-source 20B. Best for simple Q&A and classification.",
        "max_tokens": 4096,
        "temperature": 0.3,
    },
    "balanced": {
        "provider": "groq",
        "model": "qwen3.6-27b",
        "tier": QualityTier.BALANCED,
        "token_multiplier": 1.5,
        "description": "Balanced speed and quality — Groq Qwen 3.6 27B. Good for general tasks.",
        "max_tokens": 8192,
        "temperature": 0.5,
    },
    "balanced_anthropic": {
        "provider": "anthropic",
        "model": "claude-sonnet-4-6",
        "tier": QualityTier.BALANCED,
        "token_multiplier": 1.5,
        "description": "Claude Sonnet 4 — top-tier reasoning with fast response.",
        "max_tokens": 8192,
        "temperature": 0.5,
    },
    "deep_reason": {
        "provider": "anthropic",
        "model": "claude-opus-4-8",
        "tier": QualityTier.BEST,
        "token_multiplier": 3.0,
        "description": "Claude Opus 4 — strongest reasoning for complex analysis.",
        "max_tokens": 16384,
        "temperature": 0.3,
    },
    "reasoning_oss": {
        "provider": "groq",
        "model": "gpt-oss-120b",
        "tier": QualityTier.BEST,
        "token_multiplier": 2.0,
        "description": "Groq's open-source 120B — powerful reasoning, free tier available.",
        "max_tokens": 16384,
        "temperature": 0.3,
    },
    "local_private": {
        "provider": "ollama",
        "model": "qwen3:latest",
        "tier": QualityTier.FAST,
        "token_multiplier": 0,
        "description": "Ollama local — data never leaves your server. Zero cost.",
        "max_tokens": 4096,
        "temperature": 0.5,
    },
    "embeddings": {
        "provider": "ollama",
        "model": "nomic-embed-text",
        "tier": QualityTier.FAST,
        "token_multiplier": 0,
        "description": "Local embeddings via Ollama Nomic Embed Text — 384-dim vectors.",
        "max_tokens": 512,
        "temperature": 0,
    },
    "transcription": {
        "provider": "groq",
        "model": "whisper-large-v3-turbo",
        "tier": QualityTier.FAST,
        "token_multiplier": 1.0,
        "description": "Groq Whisper Large v3 Turbo — fastest speech-to-text.",
        "max_tokens": 0,
        "temperature": 0,
    },
    "openai_gpt4o": {
        "provider": "openai",
        "model": "gpt-4o",
        "tier": QualityTier.BEST,
        "token_multiplier": 2.5,
        "description": "OpenAI GPT-4o — multimodal, strong reasoning, broad knowledge.",
        "max_tokens": 16384,
        "temperature": 0.7,
    },
    "openai_gpt4o_mini": {
        "provider": "openai",
        "model": "gpt-4o-mini",
        "tier": QualityTier.FAST,
        "token_multiplier": 1.0,
        "description": "OpenAI GPT-4o Mini — fast, cheap, good for most tasks.",
        "max_tokens": 4096,
        "temperature": 0.5,
    },
    "google_gemini_flash": {
        "provider": "google",
        "model": "gemini-2.0-flash",
        "tier": QualityTier.FAST,
        "token_multiplier": 1.0,
        "description": "Google Gemini 2.0 Flash — fast, free tier available, multimodal.",
        "max_tokens": 8192,
        "temperature": 0.5,
    },
    "google_gemini_pro": {
        "provider": "google",
        "model": "gemini-2.5-pro",
        "tier": QualityTier.BEST,
        "token_multiplier": 2.0,
        "description": "Google Gemini 2.5 Pro — strongest reasoning, 1M context window.",
        "max_tokens": 16384,
        "temperature": 0.5,
    },
    "deepseek_chat": {
        "provider": "deepseek",
        "model": "deepseek-chat",
        "tier": QualityTier.BALANCED,
        "token_multiplier": 1.0,
        "description": "DeepSeek Chat — strong general purpose, code generation.",
        "max_tokens": 8192,
        "temperature": 0.5,
    },
    "deepseek_reasoner": {
        "provider": "deepseek",
        "model": "deepseek-reasoner",
        "tier": QualityTier.BEST,
        "token_multiplier": 2.0,
        "description": "DeepSeek Reasoner — chain-of-thought reasoning for complex tasks.",
        "max_tokens": 16384,
        "temperature": 0.3,
    },
    "cohere_command_r": {
        "provider": "cohere",
        "model": "command-r-plus",
        "tier": QualityTier.BALANCED,
        "token_multiplier": 1.5,
        "description": "Cohere Command R+ — RAG-optimized, tool use, enterprise-grade.",
        "max_tokens": 4096,
        "temperature": 0.5,
    },
    "xai_grok": {
        "provider": "xai",
        "model": "grok-3-beta",
        "tier": QualityTier.BEST,
        "token_multiplier": 2.0,
        "description": "xAI Grok 3 Beta — real-time web search, strong reasoning.",
        "max_tokens": 8192,
        "temperature": 0.5,
    },
    "perplexity_sonar": {
        "provider": "perplexity",
        "model": "sonar-pro",
        "tier": QualityTier.BEST,
        "token_multiplier": 2.0,
        "description": "Perplexity Sonar Pro — online LLM with real-time citations.",
        "max_tokens": 8192,
        "temperature": 0.5,
    },
    "mistral_large": {
        "provider": "mistral",
        "model": "mistral-large-latest",
        "tier": QualityTier.BEST,
        "token_multiplier": 2.0,
        "description": "Mistral Large — multilingual, function calling, 128K context.",
        "max_tokens": 8192,
        "temperature": 0.5,
    },
    "bedrock_claude": {
        "provider": "bedrock",
        "model": "claude-3.5-sonnet-v2",
        "tier": QualityTier.BALANCED,
        "token_multiplier": 1.5,
        "description": "AWS Bedrock Claude 3.5 Sonnet v2 — VPC-deployed, enterprise compliance.",
        "max_tokens": 4096,
        "temperature": 0.5,
    },
    "azure_gpt4o": {
        "provider": "azure",
        "model": "gpt-4o",
        "tier": QualityTier.BEST,
        "token_multiplier": 2.5,
        "description": "Azure OpenAI GPT-4o — enterprise EA, data residency, private networking.",
        "max_tokens": 16384,
        "temperature": 0.7,
    },
    "nim_llama_70b": {
        "provider": "nvidia_nim",
        "model": "llama-3.1-70b-instruct",
        "tier": QualityTier.BALANCED,
        "token_multiplier": 1.5,
        "description": "NVIDIA NIM Llama 3.1 70B — optimized inference, free tier (1000 calls).",
        "max_tokens": 4096,
        "temperature": 0.5,
    },
    "nim_nemotron": {
        "provider": "nvidia_nim",
        "model": "nemotron-4-340b",
        "tier": QualityTier.BEST,
        "token_multiplier": 2.5,
        "description": "NVIDIA Nemotron 4 340B — enterprise-scale reasoning powerhouse.",
        "max_tokens": 8192,
        "temperature": 0.3,
    },
    "local_llama3.2": {
        "provider": "ollama",
        "model": "llama3.2",
        "tier": QualityTier.FAST,
        "token_multiplier": 0,
        "description": "Ollama Llama 3.2 — local inference, 3B params, runs on any machine.",
        "max_tokens": 2048,
        "temperature": 0.5,
    },
    "local_qwen2.5": {
        "provider": "ollama",
        "model": "qwen2.5:72b",
        "tier": QualityTier.BALANCED,
        "token_multiplier": 0,
        "description": "Ollama Qwen 2.5 72B — strongest local model for complex tasks.",
        "max_tokens": 4096,
        "temperature": 0.5,
    },
    "local_mistral": {
        "provider": "ollama",
        "model": "mistral:latest",
        "tier": QualityTier.FAST,
        "token_multiplier": 0,
        "description": "Ollama Mistral — efficient local model, good for general tasks.",
        "max_tokens": 2048,
        "temperature": 0.5,
    },
    "local_deepseek_r1": {
        "provider": "ollama",
        "model": "deepseek-r1:latest",
        "tier": QualityTier.BALANCED,
        "token_multiplier": 0,
        "description": "Ollama DeepSeek R1 — local chain-of-thought reasoning.",
        "max_tokens": 4096,
        "temperature": 0.3,
    },
    "local_gemma2": {
        "provider": "ollama",
        "model": "gemma2:9b",
        "tier": QualityTier.FAST,
        "token_multiplier": 0,
        "description": "Ollama Gemma 2 9B — efficient Google model, strong reasoning.",
        "max_tokens": 2048,
        "temperature": 0.5,
    },
    "hf_mistral": {
        "provider": "huggingface",
        "model": "Mistral-7B-Instruct-v0.3",
        "tier": QualityTier.FAST,
        "token_multiplier": 0,
        "description": "HuggingFace Mistral 7B — free inference API, rate-limited.",
        "max_tokens": 2048,
        "temperature": 0.5,
    },
    "omni_free_fast": {
        "provider": "omniroute",
        "model": "auto/fast",
        "tier": QualityTier.FAST,
        "token_multiplier": 0,
        "description": "OmniRoute free fast gateway — auto-selects best free provider.",
        "max_tokens": 2048,
        "temperature": 0.5,
    },
    "omni_free_balanced": {
        "provider": "omniroute",
        "model": "auto/balanced",
        "tier": QualityTier.BALANCED,
        "token_multiplier": 0,
        "description": "OmniRoute free balanced gateway — quality/routing trade-off.",
        "max_tokens": 4096,
        "temperature": 0.5,
    },
    "omni_free_reasoning": {
        "provider": "omniroute",
        "model": "auto/reasoning",
        "tier": QualityTier.BEST,
        "token_multiplier": 0,
        "description": "OmniRoute free reasoning gateway — best quality for complex tasks.",
        "max_tokens": 8192,
        "temperature": 0.3,
    },
}

PROFILE_FALLBACKS = {
    "balanced": "balanced_anthropic",
    "balanced_anthropic": "deep_reason",
    "deep_reason": "google_gemini_pro",
    "fast_cheap": "google_gemini_flash",
    "google_gemini_flash": "fast_cheap",
    "reasoning_oss": "deep_reason",
}


# Orchestrator components (persistent circuit breaker + budget/usage tracking)
_orchestrator_vault = AccountsVault()
_orchestrator_pool = TokenPoolManager()
_orchestrator_budget = BudgetEnforcer(vault=_orchestrator_vault, token_pool=_orchestrator_pool)
_orchestrator_breaker = CircuitBreaker()
_orchestrator_failover = FailoverRouter(token_pool=_orchestrator_pool, breaker=_orchestrator_breaker)


class CircuitBreaker:
    """Tracks provider failures and prevents cascading retries."""

    def __init__(self, failure_threshold: int = 3, recovery_timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self._failures: dict[str, list[float]] = {}
        self._open_until: dict[str, float] = {}

    def record_failure(self, provider: str):
        now = time.time()
        self._failures.setdefault(provider, [])
        self._failures[provider] = [t for t in self._failures[provider] if now - t < 120]
        self._failures[provider].append(now)
        if len(self._failures[provider]) >= self.failure_threshold:
            self._open_until[provider] = now + self.recovery_timeout
            logger.warning("Circuit breaker OPEN for %s until %s", provider, self._open_until[provider])

    def record_success(self, provider: str):
        self._failures.pop(provider, None)
        self._open_until.pop(provider, None)

    def is_open(self, provider: str) -> bool:
        if provider in self._open_until:
            if time.time() < self._open_until[provider]:
                return True
            del self._open_until[provider]
            logger.info("Circuit breaker reset for %s", provider)
        return False

    def status(self, provider: str) -> str:
        if self.is_open(provider):
            return "open"
        recent = len([t for t in self._failures.get(provider, []) if time.time() - t < 120])
        if recent >= self.failure_threshold - 1:
            return "degraded"
        return "healthy"


_circuit_breaker = CircuitBreaker()


def get_profile(profile_id: str) -> Optional[dict]:
    return MODEL_PROFILES.get(profile_id)


def get_fallback_profile(profile_id: str) -> Optional[str]:
    return PROFILE_FALLBACKS.get(profile_id)


def list_profiles(tier: Optional[str] = None, provider: Optional[str] = None) -> list[dict]:
    results = []
    for pid, profile in MODEL_PROFILES.items():
        if tier and profile.get("tier", {}).value != tier:
            continue
        if provider and profile.get("provider") != provider:
            continue
        results.append({"id": pid, **profile})
    return results


def get_circuit_breaker() -> CircuitBreaker:
    return _orchestrator_breaker


def _extract_content(response: dict) -> str:
    choices = response.get("choices", [])
    if choices and isinstance(choices[0], dict):
        message = choices[0].get("message", {})
        return message.get("content", "")
    return ""


async def _resolve_provider_key(provider_id: str, user_id: str = "") -> str:
    """Resolve an API key for a provider from orchestrator vault, BYOK vault, or env vars."""
    try:
        acct = await _orchestrator_vault.get_account(provider_id)
        if acct and acct.get("api_key"):
            return acct["api_key"]
    except Exception:
        pass
    try:
        from shared.byok_vault import resolve_key
        key = await resolve_key(provider_id, user_id)
        if key:
            return key
    except Exception:
        pass
    return ""


def _provider_base_url(provider_id: str) -> str:
    """Return the configured base URL for a provider."""
    from ai_marketplace import PROVIDER_REGISTRY

    registry = PROVIDER_REGISTRY.get(provider_id, {})
    base_url = PROVIDER_BASE_URLS.get(provider_id, "")
    if registry.get("base_url"):
        base_url = registry["base_url"]
    if provider_id in ("ollama", "gpt4all", "localai", "llamacpp", "vllm", "kobold"):
        base_url = registry.get("default_url", base_url)
    return base_url


def _extract_system_user(messages: list[dict]) -> tuple[str, str]:
    system = "You are a helpful AI assistant."
    user = ""
    for m in messages:
        role = m.get("role")
        content = m.get("content", "")
        if role == "system" and not user:
            system = content
        elif role == "user":
            user = content
    if not user:
        user = messages[-1].get("content", "") if messages else ""
    return system, user


async def _route_provider(
    provider_id: str,
    model: str,
    messages: list[dict],
    max_tokens: int,
    temperature: float,
    user_id: str = "",
) -> tuple[Optional[dict], int]:
    """Call a provider through the orchestrator and return (response_dict, status_code)."""
    from ai_marketplace import PROVIDER_REGISTRY, get_provider

    registry = PROVIDER_REGISTRY.get(provider_id, {})
    api_key = ""
    if registry.get("requires_key", True):
        api_key = await _resolve_provider_key(provider_id, user_id)
        if not api_key:
            return None, 0

    base_url = _provider_base_url(provider_id)
    provider = get_provider(provider_id, key=api_key, base_url=base_url, model=model)
    system_prompt, user_prompt = _extract_system_user(messages)

    try:
        content = await provider.chat(system_prompt, user_prompt, max_tokens)
        return {
            "id": f"wehive-{uuid.uuid4().hex[:12]}",
            "object": "chat.completion",
            "model": model,
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": content},
                    "finish_reason": "stop",
                }
            ],
            "usage": {},
        }, 200
    except httpx.HTTPStatusError as e:
        status = e.response.status_code if e.response else 500
        logger.warning("Provider %s HTTP error %s: %s", provider_id, status, e)
        return None, status
    except Exception as e:
        logger.warning("Provider %s call failed: %s", provider_id, e)
        return None, 500


async def chat_with_profile(
    profile_id: str,
    messages: list[dict],
    max_tokens: int = 1024,
    temperature: float = None,
    user_id: str = "",
) -> dict:
    """Chat using a curated model profile with budget checks and automatic failover."""
    profile = get_profile(profile_id)
    if not profile:
        return {"error": f"Unknown profile: {profile_id}"}

    provider_id = profile["provider"]
    model = profile["model"]
    temp = temperature if temperature is not None else profile.get("temperature", 0.5)
    tok = max_tokens or profile.get("max_tokens", 1024)

    with_profile = list(messages)
    if not any(m.get("role") == "system" for m in with_profile):
        with_profile.insert(0, {"role": "system", "content": "You are a helpful AI assistant."})

    estimated_prompt_tokens = estimate_tokens(with_profile, model)

    # Check persistent circuit breaker
    if not _orchestrator_breaker.allow(provider_id):
        fallback_id = get_fallback_profile(profile_id)
        if fallback_id:
            logger.info("Provider %s circuit open, falling back to %s", provider_id, fallback_id)
            return await chat_with_profile(fallback_id, messages, max_tokens, temperature, user_id)
        return {"error": f"Provider {provider_id} unavailable and no fallback configured"}

    # Check budget (skip if no orchestrator account exists; env/BYOK keys are treated as unlimited)
    try:
        acct = await _orchestrator_vault.get_account(provider_id)
        if acct and not await _orchestrator_budget.pre_check(provider_id, estimated_prompt_tokens + tok):
            logger.warning("Provider %s budget exhausted; falling back", provider_id)
            fallback_id = get_fallback_profile(profile_id)
            if fallback_id:
                return await chat_with_profile(fallback_id, messages, max_tokens, temperature, user_id)
            return {"error": f"Provider {provider_id} budget exhausted"}
    except Exception as e:
        logger.warning("Budget pre-check failed for %s: %s", provider_id, e)

    request_id = str(uuid.uuid4())
    try:
        response, status_code = await _route_provider(
            provider_id, model, with_profile, tok, temp, user_id
        )

        if response:
            await _orchestrator_breaker.record_success(provider_id)
            usage = response.get("usage", {}) or {}
            prompt_tokens = usage.get("prompt_tokens") or estimated_prompt_tokens
            completion_tokens = usage.get("completion_tokens") or estimate_tokens(
                [{"role": "assistant", "content": _extract_content(response)}], model
            )
            total_tokens = usage.get("total_tokens") or (prompt_tokens + completion_tokens)
            cost_usd = calculate_cost(provider_id, prompt_tokens, completion_tokens, model)
            await _orchestrator_pool.record_consumption(
                provider_id, model, total_tokens, request_id=request_id, cost_usd=cost_usd
            )
            return {
                "ok": True,
                "profile": profile_id,
                "provider": provider_id,
                "model": model,
                "tier": profile.get("tier", QualityTier.BALANCED).value,
                "content": _extract_content(response),
                "usage": {
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "total_tokens": total_tokens,
                    "estimated_cost_usd": cost_usd,
                },
                "request_id": request_id,
            }

        # Provider returned an error status code
        await _orchestrator_breaker.record_failure(provider_id, status_code or 500)
        logger.error("Profile %s (provider %s) failed with status %s", profile_id, provider_id, status_code)

        fallback_id = get_fallback_profile(profile_id)
        if fallback_id and fallback_id != profile_id:
            logger.info("Failing over from %s to %s", profile_id, fallback_id)
            return await chat_with_profile(fallback_id, messages, max_tokens, temperature, user_id)

        return {"error": f"Provider {provider_id} failed (status {status_code})"}

    except httpx.HTTPStatusError as e:
        status_code = e.response.status_code if e.response else 500
        logger.error("Profile %s (provider %s) HTTP error: %s", profile_id, provider_id, e)
        await _orchestrator_breaker.record_failure(provider_id, status_code)
        fallback_id = get_fallback_profile(profile_id)
        if fallback_id and fallback_id != profile_id:
            return await chat_with_profile(fallback_id, messages, max_tokens, temperature, user_id)
        return {"error": f"Provider {provider_id} HTTP error {status_code}"}

    except Exception as e:
        logger.error("Profile %s (provider %s) failed: %s", profile_id, provider_id, e)
        await _orchestrator_breaker.record_failure(provider_id, 500)

        fallback_id = get_fallback_profile(profile_id)
        if fallback_id and fallback_id != profile_id:
            logger.info("Failing over from %s to %s", profile_id, fallback_id)
            return await chat_with_profile(fallback_id, messages, max_tokens, temperature, user_id)

        return {"error": f"Provider {provider_id} error: {e}"}


def circuit_breaker_status() -> dict:
    statuses = {}
    for provider in set(p["provider"] for p in MODEL_PROFILES.values()):
        state = _orchestrator_breaker.get_state(provider)
        statuses[provider] = state["state"].lower()
    return {"circuit_breaker": statuses, "profiles_available": len(MODEL_PROFILES)}
