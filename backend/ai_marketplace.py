"""AI Marketplace — multi-provider LLM routing layer.

Users can connect any open-source or proprietary LLM provider via API key
in Settings → AI Marketplace.  The backend routes ask the marketplace for
 completions; the marketplace routes the request to the currently-active
 provider.

Supported providers
-------------------
ollama          Local models via Ollama (no cloud API key)
openrouter      Aggregator (OpenAI-compatible endpoint, many models)
huggingface     HF Inference API (serverless + dedicated)
mistral         Mistral AI API (La Plateforme)
groq            GroqCloud (ultra-fast inference)
cohere          Cohere API
anthropic       Claude API
openai          OpenAI GPT (fallback / paid)
"""

from __future__ import annotations

import abc
import base64
import json
import logging
import os
import re
from typing import Optional

import httpx

logger = logging.getLogger("wehive.ai_marketplace")

# ---------------------------------------------------------------------------
# Provider registry
# ---------------------------------------------------------------------------

PROVIDER_REGISTRY: dict[str, dict] = {
    "ollama": {
        "name": "Ollama",
        "description": "Run open-source models locally (Llama, Mistral, etc.)",
        "website": "https://ollama.com",
        "requires_key": False,
        "key_label": "Base URL (optional)",
        "key_placeholder": "http://localhost:11434",
        "default_url": "http://localhost:11434",
        "models": ["llama3.2", "llama3.1", "mistral", "gemma2", "phi4"],
        "docs": "https://github.com/ollama/ollama/blob/main/docs/api.md",
    },
    "openrouter": {
        "name": "OpenRouter",
        "description": "Access 200+ models including open-source and commercial LLMs",
        "website": "https://openrouter.ai",
        "requires_key": True,
        "key_label": "API Key",
        "key_placeholder": "sk-or-...",
        "base_url": "https://openrouter.ai/api/v1",
        "models": [
            "meta-llama/llama-3.2-70b-instruct",
            "meta-llama/llama-3.1-405b-instruct",
            "mistralai/mistral-large-2411",
            "anthropic/claude-3.5-sonnet",
            "openai/gpt-4o",
        ],
        "docs": "https://openrouter.ai/docs",
    },
    "huggingface": {
        "name": "Hugging Face",
        "description": "Inference API for thousands of open-source models",
        "website": "https://huggingface.co",
        "requires_key": True,
        "key_label": "HF Token",
        "key_placeholder": "hf_...",
        "base_url": "https://api-inference.huggingface.co/models",
        "models": [
            "meta-llama/Llama-3.2-70B-Instruct",
            "mistralai/Mistral-Large-Instruct-2411",
            "HuggingFaceH4/zephyr-orpo-141b-A35b-v0.1",
        ],
        "docs": "https://huggingface.co/docs/api-inference/index",
    },
    "mistral": {
        "name": "Mistral AI",
        "description": "Mistral's own API (open-weight + commercial models)",
        "website": "https://mistral.ai",
        "requires_key": True,
        "key_label": "API Key",
        "key_placeholder": "...",
        "base_url": "https://api.mistral.ai/v1",
        "models": [
            "mistral-large-latest",
            "mistral-medium-latest",
            "codestral-latest",
        ],
        "docs": "https://docs.mistral.ai",
    },
    "groq": {
        "name": "Groq",
        "description": "Ultra-fast inference for open models (Llama, Mixtral, Gemma)",
        "website": "https://groq.com",
        "requires_key": True,
        "key_label": "API Key",
        "key_placeholder": "gsk_...",
        "base_url": "https://api.groq.com/openai/v1",
        "models": [
            "llama-3.2-70b-versatile",
            "llama-3.1-405b-reasoning",
            "mixtral-8x7b-32768",
            "gemma2-9b-it",
        ],
        "docs": "https://console.groq.com/docs",
    },
    "cohere": {
        "name": "Cohere",
        "description": "Command and Embed models via Cohere API",
        "website": "https://cohere.com",
        "requires_key": True,
        "key_label": "API Key",
        "key_placeholder": "...",
        "base_url": "https://api.cohere.com/v1",
        "models": ["command-r-plus", "command-r", "command-nightly"],
        "docs": "https://docs.cohere.com",
    },
    "anthropic": {
        "name": "Anthropic (Claude)",
        "description": "Claude family of models via Anthropic API",
        "website": "https://anthropic.com",
        "requires_key": True,
        "key_label": "API Key",
        "key_placeholder": "sk-ant-...",
        "base_url": "https://api.anthropic.com/v1",
        "models": [
            "claude-3-5-sonnet-20241022",
            "claude-3-5-haiku-20241001",
            "claude-3-opus-20240229",
        ],
        "docs": "https://docs.anthropic.com",
    },
    "openai": {
        "name": "OpenAI",
        "description": "GPT-4o, GPT-4o-mini and other OpenAI models",
        "website": "https://openai.com",
        "requires_key": True,
        "key_label": "API Key",
        "key_placeholder": "sk-...",
        "base_url": "https://api.openai.com/v1",
        "models": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
        "docs": "https://platform.openai.com/docs",
    },
}


# ---------------------------------------------------------------------------
# Abstract provider
# ---------------------------------------------------------------------------

class BaseProvider(abc.ABC):
    """Abstract LLM provider."""

    def __init__(self, key: str = "", base_url: str = "", model: str = ""):
        self.key = key
        self.base_url = base_url
        self.model = model

    @property
    def name(self) -> str:
        return self.__class__.__name__

    async def chat(self, system_prompt: str, user_prompt: str, max_tokens: int = 1024) -> str:
        raise NotImplementedError

    async def chat_with_image(self, system_prompt: str, user_prompt: str, image_b64: str, mime: str, max_tokens: int = 1024) -> str:
        """Vision-capable chat — default raises NotImplemented."""
        raise NotImplementedError


# ---------------------------------------------------------------------------
# Concrete providers
# ---------------------------------------------------------------------------

class OllamaProvider(BaseProvider):
    """Local Ollama server."""

    async def chat(self, system_prompt: str, user_prompt: str, max_tokens: int = 1024) -> str:
        url = f"{self.base_url}/api/chat"
        payload = {
            "model": self.model or "llama3.2",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "stream": False,
        }
        async with httpx.AsyncClient(timeout=120.0) as client:
            r = await client.post(url, json=payload)
            r.raise_for_status()
            data = r.json()
            return data.get("message", {}).get("content", "")

    async def chat_with_image(self, system_prompt: str, user_prompt: str, image_b64: str, mime: str, max_tokens: int = 1024) -> str:
        url = f"{self.base_url}/api/chat"
        payload = {
            "model": self.model or "llava",
            "messages": [
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": user_prompt,
                    "images": [image_b64],
                },
            ],
            "stream": False,
        }
        async with httpx.AsyncClient(timeout=120.0) as client:
            r = await client.post(url, json=payload)
            r.raise_for_status()
            data = r.json()
            return data.get("message", {}).get("content", "")


class OpenAICompatProvider(BaseProvider):
    """Generic OpenAI-compatible provider (OpenAI, Groq, Mistral, OpenRouter)."""

    async def chat(self, system_prompt: str, user_prompt: str, max_tokens: int = 1024) -> str:
        if not self.key or not self.base_url:
            raise RuntimeError("API key and base_url required")
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "max_tokens": max_tokens,
        }
        async with httpx.AsyncClient(timeout=120.0) as client:
            r = await client.post(url, headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()
            return data["choices"][0]["message"]["content"]

    async def chat_with_image(self, system_prompt: str, user_prompt: str, image_b64: str, mime: str, max_tokens: int = 1024) -> str:
        if not self.key or not self.base_url:
            raise RuntimeError("API key and base_url required")
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": user_prompt},
                        {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{image_b64}"}},
                    ],
                },
            ],
            "max_tokens": max_tokens,
        }
        async with httpx.AsyncClient(timeout=120.0) as client:
            r = await client.post(url, headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()
            return data["choices"][0]["message"]["content"]


class HuggingFaceProvider(BaseProvider):
    """Hugging Face Inference API."""

    async def chat(self, system_prompt: str, user_prompt: str, max_tokens: int = 1024) -> str:
        if not self.key:
            raise RuntimeError("HF token required")
        model = self.model or "meta-llama/Llama-3.2-70B-Instruct"
        url = f"https://api-inference.huggingface.co/models/{model}"
        headers = {"Authorization": f"Bearer {self.key}"}
        payload = {
            "inputs": f"<|system|>\n{system_prompt}\n<|user|>\n{user_prompt}\n<|assistant|>\n",
            "parameters": {"max_new_tokens": max_tokens, "return_full_text": False},
        }
        async with httpx.AsyncClient(timeout=120.0) as client:
            r = await client.post(url, headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()
            if isinstance(data, list) and len(data) > 0:
                return data[0].get("generated_text", "")
            return str(data)

    async def chat_with_image(self, system_prompt: str, user_prompt: str, image_b64: str, mime: str, max_tokens: int = 1024) -> str:
        # HF doesn't have a unified vision endpoint; fallback to text-only
        logger.warning("HF vision not supported, using text only")
        return await self.chat(system_prompt, user_prompt, max_tokens)


class AnthropicProvider(BaseProvider):
    """Anthropic Claude API."""

    async def chat(self, system_prompt: str, user_prompt: str, max_tokens: int = 1024) -> str:
        if not self.key:
            raise RuntimeError("Anthropic API key required")
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": self.key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model or "claude-3-5-sonnet-20241022",
            "max_tokens": max_tokens,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}],
        }
        async with httpx.AsyncClient(timeout=120.0) as client:
            r = await client.post(url, headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()
            return data["content"][0]["text"]

    async def chat_with_image(self, system_prompt: str, user_prompt: str, image_b64: str, mime: str, max_tokens: int = 1024) -> str:
        if not self.key:
            raise RuntimeError("Anthropic API key required")
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": self.key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model or "claude-3-5-sonnet-20241022",
            "max_tokens": max_tokens,
            "system": system_prompt,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": user_prompt},
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": mime,
                                "data": image_b64,
                            },
                        },
                    ],
                }
            ],
        }
        async with httpx.AsyncClient(timeout=120.0) as client:
            r = await client.post(url, headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()
            return data["content"][0]["text"]


class CohereProvider(BaseProvider):
    """Cohere API."""

    async def chat(self, system_prompt: str, user_prompt: str, max_tokens: int = 1024) -> str:
        if not self.key:
            raise RuntimeError("Cohere API key required")
        url = "https://api.cohere.com/v1/chat"
        headers = {
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model or "command-r-plus",
            "message": user_prompt,
            " preamble": system_prompt,
            "max_tokens": max_tokens,
        }
        async with httpx.AsyncClient(timeout=120.0) as client:
            r = await client.post(url, headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()
            return data.get("text", "")

    async def chat_with_image(self, system_prompt: str, user_prompt: str, image_b64: str, mime: str, max_tokens: int = 1024) -> str:
        logger.warning("Cohere vision not supported, using text only")
        return await self.chat(system_prompt, user_prompt, max_tokens)


# ---------------------------------------------------------------------------
# Provider factory
# ---------------------------------------------------------------------------

PROVIDER_CLASSES = {
    "ollama": OllamaProvider,
    "openrouter": OpenAICompatProvider,
    "huggingface": HuggingFaceProvider,
    "mistral": OpenAICompatProvider,
    "groq": OpenAICompatProvider,
    "cohere": CohereProvider,
    "anthropic": AnthropicProvider,
    "openai": OpenAICompatProvider,
}


def get_provider(provider_id: str, key: str = "", base_url: str = "", model: str = "") -> BaseProvider:
    """Factory: return instantiated provider."""
    cls = PROVIDER_CLASSES.get(provider_id, OpenAICompatProvider)
    # Derive base_url from registry if not provided
    if not base_url and provider_id in PROVIDER_REGISTRY:
        reg = PROVIDER_REGISTRY[provider_id]
        base_url = reg.get("base_url", "")
        if provider_id == "ollama":
            base_url = reg.get("default_url", "http://localhost:11434")
    return cls(key=key, base_url=base_url, model=model)


# ---------------------------------------------------------------------------
# Marketplace manager
# ---------------------------------------------------------------------------

class AIMarketplace:
    """Routes LLM calls to the user's selected provider."""

    def __init__(self):
        self.db = None  # set at runtime from db.py

    def _user_settings(self, user_id: str) -> dict:
        """Fetch user's AI marketplace settings from DB."""
        import asyncio
        try:
            loop = asyncio.get_event_loop()
            coro = self.db["ai_settings"].find_one({"user_id": user_id})
            doc = loop.run_until_complete(coro)
            if doc:
                return doc
        except Exception:
            pass
        return {}

    async def get_active_provider(self, user_id: str) -> tuple[BaseProvider, str] | tuple[None, str]:
        """Return (provider, provider_id) for the given user, or (None, '')."""
        if self.db is None:
            from db import db as _db
            self.db = _db
        doc = await self.db["ai_settings"].find_one({"user_id": user_id})
        if not doc or not doc.get("active_provider"):
            return None, ""
        pid = doc["active_provider"]
        cfg = doc.get("providers", {}).get(pid, {})
        provider = get_provider(
            pid,
            key=cfg.get("key", ""),
            base_url=cfg.get("base_url", ""),
            model=cfg.get("model", ""),
        )
        return provider, pid

    async def chat(self, user_id: str, system_prompt: str, user_prompt: str, max_tokens: int = 1024) -> str:
        provider, pid = await self.get_active_provider(user_id)
        if provider is None:
            raise RuntimeError("No AI provider configured. Please set one in Settings → AI Marketplace.")
        return await provider.chat(system_prompt, user_prompt, max_tokens)

    async def chat_with_image(self, user_id: str, system_prompt: str, user_prompt: str, image_b64: str, mime: str, max_tokens: int = 1024) -> str:
        provider, pid = await self.get_active_provider(user_id)
        if provider is None:
            raise RuntimeError("No AI provider configured. Please set one in Settings → AI Marketplace.")
        return await provider.chat_with_image(system_prompt, user_prompt, image_b64, mime, max_tokens)


# Singleton instance
marketplace = AIMarketplace()
