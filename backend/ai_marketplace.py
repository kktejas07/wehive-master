"""AI Marketplace — multi-provider LLM routing layer.

Users can connect any open-source or proprietary LLM provider via API key
in Settings → AI Marketplace.  The backend routes ask the marketplace for
 completions; the marketplace routes the request to the currently-active
 provider.

When a user has no personal provider configured, the market place falls
back to env-var defaults so Eva works out of the box:

    DEFAULT_LLM_PROVIDER  (e.g. "openai" | "groq" | "openrouter")
    DEFAULT_LLM_KEY       (your API key)
    DEFAULT_LLM_MODEL     (optional, e.g. "gpt-4o" | "llama-3.3-70b")

If none of these are set either, the call fails with a clear error.

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
fireworks       Fireworks AI (ultra-fast inference)
together        Together AI (hosted open-source models)
deepseek        DeepSeek (open-weight models)
azure           Azure OpenAI (Microsoft hosted)
google          Google AI / Gemini API
voyage          Voyage AI (embeddings & reranking)
sambanova       SambaNova (enterprise open models)
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

PRICING_TIER_FREE = "free"
PRICING_TIER_FREE_PAID = "free_paid"
PRICING_TIER_PAID = "paid"

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
        "powered_by_tagline": "Powered by Ollama in Association with We Hive",
        "pricing_tier": PRICING_TIER_FREE,
        "category": "llm",
    },
    "gpt4all": {
        "name": "GPT4All",
        "description": "Local open-source models that run on your own machine (no GPU needed)",
        "website": "https://gpt4all.io",
        "requires_key": False,
        "key_label": "Base URL",
        "key_placeholder": "http://localhost:4891",
        "default_url": "http://localhost:4891",
        "models": ["mistral-7b-openorca", "llama-3.2-3b-instruct", "phi-3-mini", "nous-hermes-2-mixtral"],
        "docs": "https://docs.gpt4all.io",
        "powered_by_tagline": "Powered by GPT4All in Association with We Hive",
        "pricing_tier": PRICING_TIER_FREE,
        "category": "llm",
    },
    "localai": {
        "name": "LocalAI",
        "description": "Self-hosted OpenAI-compatible API — run models locally with Docker",
        "website": "https://localai.io",
        "requires_key": False,
        "key_label": "Base URL",
        "key_placeholder": "http://localhost:8080",
        "default_url": "http://localhost:8080",
        "models": ["llama-3.2-3b-instruct", "phi-3-mini-4k", "mistral-7b-openorca"],
        "docs": "https://localai.io/docs",
        "powered_by_tagline": "Powered by LocalAI in Association with We Hive",
        "pricing_tier": PRICING_TIER_FREE,
        "category": "llm",
    },
    "llamacpp": {
        "name": "llama.cpp",
        "description": "Run GGUF models locally via llama.cpp server (CPU/GPU, any quant)",
        "website": "https://github.com/ggerganov/llama.cpp",
        "requires_key": False,
        "key_label": "Server URL",
        "key_placeholder": "http://localhost:8080",
        "default_url": "http://localhost:8080",
        "models": ["llama-3.2-3b-instruct-Q4_K_M", "mistral-7b-instruct-v0.3-Q4_K_M"],
        "docs": "https://github.com/ggerganov/llama.cpp",
        "powered_by_tagline": "Powered by llama.cpp in Association with We Hive",
        "pricing_tier": PRICING_TIER_FREE,
        "category": "llm",
    },
    "sentence-transformers": {
        "name": "Sentence Transformers",
        "description": "Local embeddings for semantic intent matching and RAG (no API key)",
        "website": "https://sbert.net",
        "requires_key": False,
        "key_label": "", "key_placeholder": "",
        "base_url": "", "models": ["all-MiniLM-L6-v2", "all-mpnet-base-v2", "multi-qa-mpnet-base-dot-v1"],
        "docs": "https://sbert.net",
        "powered_by_tagline": "Powered by Sentence Transformers",
        "pricing_tier": PRICING_TIER_FREE,
        "category": "llm",
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
        "powered_by_tagline": "Powered by OpenRouter in Association with We Hive",
        "pricing_tier": PRICING_TIER_FREE_PAID,
        "category": "llm",
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
        "powered_by_tagline": "Powered by Hugging Face in Association with We Hive",
        "pricing_tier": PRICING_TIER_FREE_PAID,
        "category": "llm",
    },
    "mistral": {
        "name": "Mistral AI",
        "description": "Mistral's own API (open-weight + commercial models)",
        "website": "https://mistral.ai",
        "requires_key": True,
        "key_label": "API Key",
        "key_placeholder": "...",
        "base_url": "https://api.mistral.ai/v1",
        "models": ["mistral-large-latest", "mistral-medium-latest", "codestral-latest"],
        "docs": "https://docs.mistral.ai",
        "powered_by_tagline": "Powered by Mistral AI in Association with We Hive",
        "pricing_tier": PRICING_TIER_FREE_PAID,
        "category": "llm",
    },
    "groq": {
        "name": "Groq",
        "description": "Ultra-fast inference for open models (Llama, Mixtral, Gemma)",
        "website": "https://groq.com",
        "requires_key": True,
        "key_label": "API Key",
        "key_placeholder": "gsk_...",
        "base_url": "https://api.groq.com/openai/v1",
        "models": ["llama-3.3-70b-versatile", "llama-3.1-405b-reasoning", "mixtral-8x7b-32768", "gemma2-9b-it"],
        "docs": "https://console.groq.com/docs",
        "powered_by_tagline": "Powered by Groq in Association with We Hive",
        "pricing_tier": PRICING_TIER_FREE_PAID,
        "category": "llm",
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
        "powered_by_tagline": "Powered by Cohere in Association with We Hive",
        "pricing_tier": PRICING_TIER_FREE_PAID,
        "category": "llm",
    },
    "anthropic": {
        "name": "Anthropic (Claude)",
        "description": "Claude family of models via Anthropic API",
        "website": "https://anthropic.com",
        "requires_key": True,
        "key_label": "API Key",
        "key_placeholder": "sk-ant-...",
        "base_url": "https://api.anthropic.com/v1",
        "models": ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241001", "claude-3-opus-20240229"],
        "docs": "https://docs.anthropic.com",
        "powered_by_tagline": "Powered by Anthropic in Association with We Hive",
        "pricing_tier": PRICING_TIER_PAID,
        "category": "llm",
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
        "powered_by_tagline": "Powered by OpenAI in Association with We Hive",
        "pricing_tier": PRICING_TIER_PAID,
        "category": "llm",
    },
    "fireworks": {
        "name": "Fireworks AI",
        "description": "Ultra-fast inference for open and commercial models",
        "website": "https://fireworks.ai",
        "requires_key": True,
        "key_label": "API Key",
        "key_placeholder": "fw_...",
        "base_url": "https://api.fireworks.ai/v1",
        "models": ["accounts/fireworks/models/llama-v3p1-405b-instruct", "accounts/fireworks/models/llama-v3p1-70b-instruct"],
        "docs": "https://docs.fireworks.ai",
        "powered_by_tagline": "Powered by Fireworks AI in Association with We Hive",
        "pricing_tier": PRICING_TIER_FREE_PAID,
        "category": "llm",
    },
    "together": {
        "name": "Together AI",
        "description": "Hosted inference for leading open-source models",
        "website": "https://together.ai",
        "requires_key": True,
        "key_label": "API Key",
        "key_placeholder": "tgk_...",
        "base_url": "https://api.together.xyz/v1",
        "models": ["meta-llama/Llama-3.3-70B-Instruct", "mistralai/Mistral-Large-Instruct-2411"],
        "docs": "https://docs.together.ai",
        "powered_by_tagline": "Powered by Together AI in Association with We Hive",
        "pricing_tier": PRICING_TIER_FREE_PAID,
        "category": "llm",
    },
    "deepseek": {
        "name": "DeepSeek",
        "description": "DeepSeek Chat and Coder — open-weight models at low cost",
        "website": "https://deepseek.com",
        "requires_key": True,
        "key_label": "API Key",
        "key_placeholder": "sk-...",
        "base_url": "https://api.deepseek.com/v1",
        "models": ["deepseek-chat", "deepseek-coder"],
        "docs": "https://platform.deepseek.com/docs",
        "powered_by_tagline": "Powered by DeepSeek in Association with We Hive",
        "pricing_tier": PRICING_TIER_FREE_PAID,
        "category": "llm",
    },
    "azure": {
        "name": "Azure OpenAI",
        "description": "OpenAI models deployed on Microsoft Azure",
        "website": "https://azure.microsoft.com/services/cognitive-services/openai/",
        "requires_key": True,
        "key_label": "API Key", "key_placeholder": "...",
        "base_url": "", "models": ["gpt-4o", "gpt-4o-mini"],
        "docs": "https://learn.microsoft.com/azure/ai-services/openai/",
        "powered_by_tagline": "Powered by Azure OpenAI in Association with We Hive",
        "pricing_tier": PRICING_TIER_PAID,
        "category": "llm",
    },
    "google": {
        "name": "Google AI (Gemini)",
        "description": "Gemini 2.5 Flash and other Gemini models",
        "website": "https://ai.google.dev",
        "requires_key": True, "key_label": "API Key", "key_placeholder": "AIza...",
        "base_url": "https://generativelanguage.googleapis.com/v1beta",
        "models": ["gemini-2.5-flash-preview-05-20", "gemini-2.0-flash", "gemini-1.5-pro"],
        "docs": "https://ai.google.dev/docs",
        "powered_by_tagline": "Powered by Google AI in Association with We Hive",
        "pricing_tier": PRICING_TIER_FREE_PAID,
        "category": "llm",
    },
    "voyage": {
        "name": "Voyage AI",
        "description": "Embeddings and reranking for semantic search / RAG",
        "website": "https://voyageai.com",
        "requires_key": True, "key_label": "API Key", "key_placeholder": "voyage-...",
        "base_url": "https://api.voyageai.com/v1",
        "models": ["voyage-large-2", "voyage-code-2"],
        "docs": "https://docs.voyageai.com",
        "powered_by_tagline": "Powered by Voyage AI in Association with We Hive",
        "pricing_tier": PRICING_TIER_FREE_PAID,
        "category": "llm",
    },
    "sambanova": {
        "name": "SambaNova",
        "description": "Fast, affordable inference for enterprise open models",
        "website": "https://sambanova.ai",
        "requires_key": True, "key_label": "API Key", "key_placeholder": "...",
        "base_url": "https://api.sambanova.ai/v1",
        "models": ["Samba-1-Large", "Samba-1-Medium"],
        "docs": "https://docs.sambanova.ai",
        "powered_by_tagline": "Powered by SambaNova in Association with We Hive",
        "pricing_tier": PRICING_TIER_PAID,
        "category": "llm",
    },
    # ── API Tools (non-LLM) ──────────────────────────────────────────────────────
    "twilio": {
        "name": "Twilio SMS",
        "description": "Send SMS and WhatsApp messages for OTP, alerts, and notifications",
        "website": "https://twilio.com", "requires_key": True,
        "key_label": "Account SID", "key_placeholder": "AC...",
        "base_url": "https://api.twilio.com",
        "docs": "https://www.twilio.com/docs",
        "powered_by_tagline": "Powered by Twilio",
        "pricing_tier": PRICING_TIER_FREE_PAID, "category": "communication",
    },
    "sendgrid": {
        "name": "SendGrid Email",
        "description": "Transactional email delivery for application updates and receipts",
        "website": "https://sendgrid.com", "requires_key": True,
        "key_label": "API Key", "key_placeholder": "SG...",
        "base_url": "https://api.sendgrid.com/v3",
        "docs": "https://docs.sendgrid.com",
        "powered_by_tagline": "Powered by SendGrid",
        "pricing_tier": PRICING_TIER_FREE_PAID, "category": "communication",
    },
    "stripe": {
        "name": "Stripe Payments",
        "description": "Process visa application payments and refunds worldwide",
        "website": "https://stripe.com", "requires_key": True,
        "key_label": "Secret Key", "key_placeholder": "sk_live_...",
        "base_url": "https://api.stripe.com/v1",
        "docs": "https://stripe.com/docs",
        "powered_by_tagline": "Powered by Stripe",
        "pricing_tier": PRICING_TIER_PAID, "category": "payments",
    },
    "razorpay": {
        "name": "Razorpay",
        "description": "Indian payment gateway for INR-based visa fee collection",
        "website": "https://razorpay.com", "requires_key": True,
        "key_label": "Key ID", "key_placeholder": "rzp_live_...",
        "base_url": "https://api.razorpay.com/v1",
        "docs": "https://razorpay.com/docs",
        "powered_by_tagline": "Powered by Razorpay",
        "pricing_tier": PRICING_TIER_FREE_PAID, "category": "payments",
    },
    "google_translate": {
        "name": "Google Translate",
        "description": "Translate documents and messages between 100+ languages",
        "website": "https://cloud.google.com/translate", "requires_key": True,
        "key_label": "API Key", "key_placeholder": "AIza...",
        "base_url": "https://translation.googleapis.com",
        "docs": "https://cloud.google.com/translate/docs",
        "powered_by_tagline": "Powered by Google Translate",
        "pricing_tier": PRICING_TIER_FREE_PAID, "category": "productivity",
    },
    "deepl": {
        "name": "DeepL Translate",
        "description": "High-quality AI translation for documents and content",
        "website": "https://deepl.com", "requires_key": True,
        "key_label": "Auth Key", "key_placeholder": "...",
        "base_url": "https://api-free.deepl.com/v2",
        "docs": "https://www.deepl.com/docs-api",
        "powered_by_tagline": "Powered by DeepL",
        "pricing_tier": PRICING_TIER_FREE_PAID, "category": "productivity",
    },
    "openweather": {
        "name": "OpenWeather",
        "description": "Weather forecasts and historical data for travel planning",
        "website": "https://openweathermap.org", "requires_key": True,
        "key_label": "API Key", "key_placeholder": "...",
        "base_url": "https://api.openweathermap.org/data",
        "docs": "https://openweathermap.org/api",
        "powered_by_tagline": "Powered by OpenWeather",
        "pricing_tier": PRICING_TIER_FREE_PAID, "category": "travel",
    },
    "amadeus": {
        "name": "Amadeus Travel",
        "description": "Flight search, hotel booking, and travel insights API",
        "website": "https://developers.amadeus.com", "requires_key": True,
        "key_label": "API Key", "key_placeholder": "...",
        "base_url": "https://test.api.amadeus.com/v1",
        "docs": "https://developers.amadeus.com/self-service",
        "powered_by_tagline": "Powered by Amadeus",
        "pricing_tier": PRICING_TIER_FREE_PAID, "category": "travel",
    },
    "skyscanner": {
        "name": "Skyscanner Flights",
        "description": "Real-time flight search, prices, and route suggestions",
        "website": "https://developers.skyscanner.net", "requires_key": True,
        "key_label": "API Key", "key_placeholder": "...",
        "base_url": "https://partners.api.skyscanner.net",
        "docs": "https://developers.skyscanner.net/docs",
        "powered_by_tagline": "Powered by Skyscanner",
        "pricing_tier": PRICING_TIER_PAID, "category": "travel",
    },
    "serpapi": {
        "name": "SerpAPI",
        "description": "Google Search results for embassy info, reviews, and web data",
        "website": "https://serpapi.com", "requires_key": True,
        "key_label": "API Key", "key_placeholder": "...",
        "base_url": "https://serpapi.com",
        "docs": "https://serpapi.com/search",
        "powered_by_tagline": "Powered by SerpAPI",
        "pricing_tier": PRICING_TIER_FREE_PAID, "category": "productivity",
    },
    "abstract_api": {
        "name": "Abstract API",
        "description": "Geolocation, phone validation, email verification, and more",
        "website": "https://abstractapi.com", "requires_key": True,
        "key_label": "API Key", "key_placeholder": "...",
        "base_url": "https://ipgeolocation.abstractapi.com",
        "docs": "https://www.abstractapi.com/api",
        "powered_by_tagline": "Powered by Abstract API",
        "pricing_tier": PRICING_TIER_FREE_PAID, "category": "productivity",
    },
    "ipinfo": {
        "name": "IPinfo",
        "description": "IP geolocation and carrier data for fraud detection",
        "website": "https://ipinfo.io", "requires_key": True,
        "key_label": "Token", "key_placeholder": "...",
        "base_url": "https://ipinfo.io",
        "docs": "https://ipinfo.io/developers",
        "powered_by_tagline": "Powered by IPinfo",
        "pricing_tier": PRICING_TIER_FREE_PAID, "category": "security",
    },
    "haveibeenpwned": {
        "name": "Have I Been Pwned",
        "description": "Check if user email/password has been compromised in a breach",
        "website": "https://haveibeenpwned.com", "requires_key": False,
        "key_label": "", "key_placeholder": "",
        "base_url": "https://haveibeenpwned.com/api/v3",
        "docs": "https://haveibeenpwned.com/API/v3",
        "powered_by_tagline": "Powered by Have I Been Pwned",
        "pricing_tier": PRICING_TIER_FREE, "category": "security",
    },
    "QR Code": {
        "name": "QR Code Generator",
        "description": "Generate QR codes for application tracking, payments, and sharing",
        "website": "https://goqr.me", "requires_key": False,
        "key_label": "", "key_placeholder": "",
        "base_url": "https://api.qrserver.com/v1",
        "docs": "https://goqr.me/api",
        "powered_by_tagline": "Powered by QR Server",
        "pricing_tier": PRICING_TIER_FREE, "category": "productivity",
    },
    "restcountries": {
        "name": "REST Countries",
        "description": "Country data: flags, capitals, currencies, languages, and borders",
        "website": "https://restcountries.com", "requires_key": False,
        "key_label": "", "key_placeholder": "",
        "base_url": "https://restcountries.com/v3.1",
        "docs": "https://restcountries.com",
        "powered_by_tagline": "Powered by REST Countries",
        "pricing_tier": PRICING_TIER_FREE, "category": "travel",
    },
    "exchange_rate": {
        "name": "ExchangeRate API",
        "description": "Live currency exchange rates for visa fee conversions",
        "website": "https://exchangerate-api.com", "requires_key": False,
        "key_label": "", "key_placeholder": "",
        "base_url": "https://api.exchangerate-api.com/v4",
        "docs": "https://www.exchangerate-api.com/docs",
        "powered_by_tagline": "Powered by ExchangeRate API",
        "pricing_tier": PRICING_TIER_FREE, "category": "productivity",
    },
    "timezone": {
        "name": "Time Zone API",
        "description": "Convert times across timezones for embassy appointments",
        "website": "https://timezonedb.com", "requires_key": False,
        "key_label": "", "key_placeholder": "",
        "base_url": "https://api.timezonedb.com/v2.1",
        "docs": "https://timezonedb.com/api",
        "powered_by_tagline": "Powered by TimeZoneDB",
        "pricing_tier": PRICING_TIER_FREE, "category": "productivity",
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
    """Generic OpenAI-compatible provider (OpenAI, Groq, Mistral, OpenRouter, Together, DeepSeek, Fireworks, SambaNova, Azure)."""

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
            "preamble": system_prompt,
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


class GoogleProvider(BaseProvider):
    """Google Gemini API via generic endpoint."""

    async def chat(self, system_prompt: str, user_prompt: str, max_tokens: int = 1024) -> str:
        if not self.key:
            raise RuntimeError("Google AI API key required")
        url = f"{self.base_url}/models/{self.model or 'gemini-2.0-flash'}:generateContent?key={self.key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [
                {"parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]}
            ],
            "generationConfig": {"maxOutputTokens": max_tokens},
        }
        async with httpx.AsyncClient(timeout=120.0) as client:
            r = await client.post(url, headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]

    async def chat_with_image(self, system_prompt: str, user_prompt: str, image_b64: str, mime: str, max_tokens: int = 1024) -> str:
        if not self.key:
            raise RuntimeError("Google AI API key required")
        mime_map = {"image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp"}
        mediatype = mime_map.get(mime, "jpeg")
        url = f"{self.base_url}/models/{self.model or 'gemini-2.0-flash'}:generateContent?key={self.key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [
                {"parts": [
                    {"text": system_prompt + "\n\n" + user_prompt},
                    {"inline_data": {"mime_type": mediatype, "data": image_b64}},
                ]}
            ],
            "generationConfig": {"maxOutputTokens": max_tokens},
        }
        async with httpx.AsyncClient(timeout=120.0) as client:
            r = await client.post(url, headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]


# ---------------------------------------------------------------------------
# Provider factory
# ---------------------------------------------------------------------------

PROVIDER_CLASSES: dict[str, type[BaseProvider]] = {
    "ollama": OllamaProvider,
    "gpt4all": OpenAICompatProvider,
    "localai": OpenAICompatProvider,
    "llamacpp": OpenAICompatProvider,
    "sentence-transformers": OpenAICompatProvider,
    "openrouter": OpenAICompatProvider,
    "huggingface": HuggingFaceProvider,
    "mistral": OpenAICompatProvider,
    "groq": OpenAICompatProvider,
    "cohere": CohereProvider,
    "anthropic": AnthropicProvider,
    "openai": OpenAICompatProvider,
    "fireworks": OpenAICompatProvider,
    "together": OpenAICompatProvider,
    "deepseek": OpenAICompatProvider,
    "azure": OpenAICompatProvider,
    "google": GoogleProvider,
    "voyage": OpenAICompatProvider,
    "sambanova": OpenAICompatProvider,
}


def get_provider(provider_id: str, key: str = "", base_url: str = "", model: str = "") -> BaseProvider:
    """Factory: return instantiated provider."""
    cls = PROVIDER_CLASSES.get(provider_id, OpenAICompatProvider)
    if not base_url and provider_id in PROVIDER_REGISTRY:
        reg = PROVIDER_REGISTRY[provider_id]
        base_url = reg.get("base_url", "")
        if provider_id in ("ollama", "gpt4all", "localai", "llamacpp"):
            base_url = reg.get("default_url", base_url)
    return cls(key=key, base_url=base_url, model=model)


# ---------------------------------------------------------------------------
# Marketplace manager
# ---------------------------------------------------------------------------

class AIMarketplace:
    """Routes LLM calls to the user's selected provider."""

    def __init__(self):
        self.db = None

    async def get_active_provider(self, user_id: str) -> tuple[BaseProvider, str] | tuple[None, str]:
        """Return (provider, provider_id) for the given user, or (None, '').
        Falls back to DEFAULT_LLM_* env vars when no user-level config exists."""
        if self.db is None:
            from db import db as _db
            self.db = _db
        doc = await self.db["ai_settings"].find_one({"user_id": user_id})
        if doc and doc.get("active_provider"):
            pid = doc["active_provider"]
            cfg = doc.get("providers", {}).get(pid, {})
            provider = get_provider(
                pid,
                key=cfg.get("key", ""),
                base_url=cfg.get("base_url", ""),
                model=cfg.get("model", ""),
            )
            return provider, pid
        # Global fallback from environment (no user config needed)
        default_key = os.environ.get("DEFAULT_LLM_KEY", "").strip()
        if default_key:
            default_provider = os.environ.get("DEFAULT_LLM_PROVIDER", "openai").strip()
            default_model = os.environ.get("DEFAULT_LLM_MODEL", "").strip()
            provider = get_provider(default_provider, key=default_key, model=default_model)
            return provider, default_provider

        # Platform-wide default configured by admin via Settings → Default LLM
        try:
            from settings_service import get_default_llm_config
            llm_cfg = await get_default_llm_config()
            if llm_cfg:
                default_key = llm_cfg.get("key", "").strip()
                if default_key:
                    default_provider = llm_cfg.get("provider", "openai").strip()
                    default_model = llm_cfg.get("model", "").strip()
                    provider = get_provider(default_provider, key=default_key, model=default_model)
                    return provider, default_provider
        except Exception:
            pass

        return None, ""

    async def chat(self, user_id: str, system_prompt: str, user_prompt: str, max_tokens: int = 1024) -> str:
        provider, pid = await self.get_active_provider(user_id)
        if provider is None:
            raise RuntimeError("No AI provider configured. Please set one in Settings → AI Marketplace.")
        return await provider.chat(system_prompt, user_prompt, max_tokens)

    async def chat_with_info(self, user_id: str, system_prompt: str, user_prompt: str, max_tokens: int = 1024) -> tuple[str, dict]:
        """Returns (reply_text, provider_info) so callers can include the tagline."""
        provider, pid = await self.get_active_provider(user_id)
        if provider is None:
            raise RuntimeError("No AI provider configured. Please set one in Settings → AI Marketplace.")
        reply = await provider.chat(system_prompt, user_prompt, max_tokens)
        meta = PROVIDER_REGISTRY.get(pid, {})
        provider_info = {
            "id": pid,
            "name": meta.get("name", pid),
            "model": provider.model,
            "powered_by_tagline": meta.get("powered_by_tagline", f"Powered by {meta.get('name', pid)} in Association with We Hive"),
        }
        return reply, provider_info

    async def chat_with_image(self, user_id: str, system_prompt: str, user_prompt: str, image_b64: str, mime: str, max_tokens: int = 1024) -> str:
        provider, pid = await self.get_active_provider(user_id)
        if provider is None:
            raise RuntimeError("No AI provider configured. Please set one in Settings → AI Marketplace.")
        return await provider.chat_with_image(system_prompt, user_prompt, image_b64, mime, max_tokens)


marketplace = AIMarketplace()
