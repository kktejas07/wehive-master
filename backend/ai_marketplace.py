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
    "xai": {
        "name": "xAI (Grok)",
        "description": "Grok models by xAI — powerful reasoning and conversational AI",
        "website": "https://x.ai", "requires_key": True,
        "key_label": "API Key", "key_placeholder": "xai-...",
        "base_url": "https://api.x.ai/v1",
        "docs": "https://docs.x.ai",
        "powered_by_tagline": "Powered by xAI Grok",
        "pricing_tier": PRICING_TIER_PAID, "category": "llm",
        "models": ["grok-3-beta", "grok-3", "grok-2"],
    },
    "perplexity": {
        "name": "Perplexity AI",
        "description": "Online LLM with real-time search — sonar-pro, sonar models",
        "website": "https://perplexity.ai", "requires_key": True,
        "key_label": "API Key", "key_placeholder": "pplx-...",
        "base_url": "https://api.perplexity.ai",
        "docs": "https://docs.perplexity.ai",
        "powered_by_tagline": "Powered by Perplexity",
        "pricing_tier": PRICING_TIER_FREE_PAID, "category": "llm",
        "models": ["sonar-pro", "sonar", "sonar-reasoning"],
    },
    "bedrock": {
        "name": "AWS Bedrock",
        "description": "Amazon Bedrock — managed foundation models from Anthropic, Meta, and more",
        "website": "https://aws.amazon.com/bedrock", "requires_key": True,
        "key_label": "Region+Key", "key_placeholder": "us-east-1:AKIA...:...",
        "base_url": "https://bedrock-runtime.{region}.amazonaws.com",
        "docs": "https://docs.aws.amazon.com/bedrock",
        "powered_by_tagline": "Powered by AWS Bedrock",
        "pricing_tier": PRICING_TIER_PAID, "category": "llm",
        "models": ["claude-3.5-sonnet-v2", "llama-3.1-70b", "claude-3-haiku"],
    },
    "nvidia_nim": {
        "name": "NVIDIA NIM",
        "description": "NVIDIA inference microservices — optimized models for enterprise",
        "website": "https://build.nvidia.com", "requires_key": True,
        "key_label": "API Key", "key_placeholder": "nvapi-...",
        "base_url": "https://integrate.api.nvidia.com/v1",
        "docs": "https://docs.api.nvidia.com",
        "powered_by_tagline": "Powered by NVIDIA NIM",
        "pricing_tier": PRICING_TIER_FREE_PAID, "category": "llm",
        "models": ["llama-3.1-70b", "nemotron-4-340b", "mixtral-8x7b"],
    },
    "omniroute": {
        "name": "OmniRoute",
        "description": "Free LLM gateway — route to the fastest/cheapest available provider",
        "website": "https://omniroute.ai", "requires_key": False,
        "key_label": "", "key_placeholder": "",
        "base_url": "https://api.omniroute.ai/v1",
        "docs": "https://docs.omniroute.ai",
        "powered_by_tagline": "Powered by OmniRoute",
        "pricing_tier": PRICING_TIER_FREE, "category": "llm",
        "models": ["fast", "balanced", "reasoning"],
    },
    "cerebras": {
        "name": "Cerebras",
        "description": "Wafer-scale ultra-fast inference — Cerebras CS-3, 1M free tokens",
        "website": "https://cerebras.ai", "requires_key": True,
        "key_label": "API Key", "key_placeholder": "csk-...",
        "base_url": "https://api.cerebras.ai/v1",
        "docs": "https://inference-docs.cerebras.ai",
        "powered_by_tagline": "Powered by Cerebras",
        "pricing_tier": PRICING_TIER_FREE_PAID, "category": "llm",
        "models": ["llama3.1-8b", "llama3.1-70b", "llama3.3-70b"],
    },
    "ai21": {
        "name": "AI21 Labs",
        "description": "Jamba models — 256K context window, hybrid SSM-Transformer architecture",
        "website": "https://www.ai21.com", "requires_key": True,
        "key_label": "API Key", "key_placeholder": "ai21-...",
        "base_url": "https://api.ai21.com/studio/v1",
        "docs": "https://docs.ai21.com",
        "powered_by_tagline": "Powered by AI21 Labs",
        "pricing_tier": PRICING_TIER_FREE_PAID, "category": "llm",
        "models": ["jamba-1.5-large", "jamba-1.5-mini"],
    },
    "together": {
        "name": "Together AI",
        "description": "Fast inference for open-source models at scale — $1 free credits",
        "website": "https://together.ai", "requires_key": True,
        "key_label": "API Key", "key_placeholder": "tgp-...",
        "base_url": "https://api.together.xyz/v1",
        "docs": "https://docs.together.ai",
        "powered_by_tagline": "Powered by Together AI",
        "pricing_tier": PRICING_TIER_FREE_PAID, "category": "llm",
        "models": ["meta-llama/Llama-3.3-70B", "mistralai/Mistral-Large-Instruct-2411"],
    },
    "fireworks": {
        "name": "Fireworks AI",
        "description": "Enterprise-ready fast inference — optimized compound AI systems",
        "website": "https://fireworks.ai", "requires_key": True,
        "key_label": "API Key", "key_placeholder": "fw_...",
        "base_url": "https://api.fireworks.ai/inference/v1",
        "docs": "https://docs.fireworks.ai",
        "powered_by_tagline": "Powered by Fireworks AI",
        "pricing_tier": PRICING_TIER_FREE_PAID, "category": "llm",
        "models": ["accounts/fireworks/models/llama-v3p1-405b-instruct", "llama-v3p1-70b-instruct"],
    },
    "replicate": {
        "name": "Replicate",
        "description": "Run and fine-tune open-source models in the cloud",
        "website": "https://replicate.com", "requires_key": True,
        "key_label": "API Token", "key_placeholder": "r8_...",
        "base_url": "https://openai.replicate.com/v1",
        "docs": "https://replicate.com/docs",
        "powered_by_tagline": "Powered by Replicate",
        "pricing_tier": PRICING_TIER_PAID, "category": "llm",
        "models": ["meta/llama-3.3-70b-instruct", "meta/meta-llama-3-70b-instruct"],
    },
    "deepinfra": {
        "name": "DeepInfra",
        "description": "Serverless inference for open-source LLMs and embeddings",
        "website": "https://deepinfra.com", "requires_key": True,
        "key_label": "API Key", "key_placeholder": "...",
        "base_url": "https://api.deepinfra.com/v1/openai",
        "docs": "https://deepinfra.com/docs",
        "powered_by_tagline": "Powered by DeepInfra",
        "pricing_tier": PRICING_TIER_FREE_PAID, "category": "llm",
        "models": ["meta-llama/Llama-3.3-70B-Instruct", "Qwen/Qwen2.5-72B-Instruct"],
    },
    "novita": {
        "name": "Novita AI",
        "description": "Fast, affordable inference for open-source models",
        "website": "https://novita.ai", "requires_key": True,
        "key_label": "API Key", "key_placeholder": "...",
        "base_url": "https://api.novita.ai/v3/openai",
        "docs": "https://novita.ai/docs",
        "powered_by_tagline": "Powered by Novita AI",
        "pricing_tier": PRICING_TIER_FREE_PAID, "category": "llm",
        "models": ["meta-llama/llama-3.3-70b-instruct", "deepseek/deepseek-v3"],
    },
    "siliconflow": {
        "name": "SiliconFlow",
        "description": "China-based fast inference platform for open-source models",
        "website": "https://siliconflow.cn", "requires_key": True,
        "key_label": "API Key", "key_placeholder": "sk-...",
        "base_url": "https://api.siliconflow.cn/v1",
        "docs": "https://docs.siliconflow.cn",
        "powered_by_tagline": "Powered by SiliconFlow",
        "pricing_tier": PRICING_TIER_FREE_PAID, "category": "llm",
        "models": ["deepseek-ai/DeepSeek-V3", "Qwen/Qwen2.5-72B-Instruct"],
    },
    "zhipu": {
        "name": "Zhipu AI",
        "description": "GLM series models from Zhipu AI",
        "website": "https://zhipu.ai", "requires_key": True,
        "key_label": "API Key", "key_placeholder": "...",
        "base_url": "https://open.bigmodel.cn/api/paas/v4",
        "docs": "https://open.bigmodel.cn/dev/howuse/glm-4",
        "powered_by_tagline": "Powered by Zhipu AI",
        "pricing_tier": PRICING_TIER_FREE_PAID, "category": "llm",
        "models": ["glm-4", "glm-4-flash", "glm-4-air"],
    },
    "moonshot": {
        "name": "Moonshot AI (Kimi)",
        "description": "Kimi long-context models by Moonshot AI",
        "website": "https://moonshot.cn", "requires_key": True,
        "key_label": "API Key", "key_placeholder": "sk-...",
        "base_url": "https://api.moonshot.cn/v1",
        "docs": "https://platform.moonshot.cn/docs",
        "powered_by_tagline": "Powered by Moonshot AI",
        "pricing_tier": PRICING_TIER_FREE_PAID, "category": "llm",
        "models": ["kimi-k2", "kimi-latest", "moonshot-v1-128k"],
    },
    "alibaba": {
        "name": "Alibaba Bailian",
        "description": "Qwen models via Alibaba Cloud Bailian",
        "website": "https://bailian.aliyun.com", "requires_key": True,
        "key_label": "API Key", "key_placeholder": "sk-...",
        "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "docs": "https://help.aliyun.com/zh/dashscope",
        "powered_by_tagline": "Powered by Alibaba Bailian",
        "pricing_tier": PRICING_TIER_FREE_PAID, "category": "llm",
        "models": ["qwen-max", "qwen-plus", "qwen-turbo"],
    },
    "cloudflare": {
        "name": "Cloudflare Workers AI",
        "description": "Serverless inference on Cloudflare's global network",
        "website": "https://developers.cloudflare.com/workers-ai", "requires_key": True,
        "key_label": "API Token (account_id:token)", "key_placeholder": "...",
        "base_url": "https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1",
        "docs": "https://developers.cloudflare.com/workers-ai/models",
        "powered_by_tagline": "Powered by Cloudflare Workers AI",
        "pricing_tier": PRICING_TIER_FREE_PAID, "category": "llm",
        "models": ["@cf/meta/llama-3.3-70b-instruct-awq", "@cf/qwen/qwen1.5-14b-awq"],
    },
    "vllm": {
        "name": "vLLM (self-hosted)",
        "description": "Self-hosted OpenAI-compatible LLM inference",
        "website": "https://vllm.ai", "requires_key": False,
        "key_label": "Base URL", "key_placeholder": "http://localhost:8000/v1",
        "default_url": "http://localhost:8000/v1",
        "docs": "https://docs.vllm.ai",
        "powered_by_tagline": "Powered by vLLM",
        "pricing_tier": PRICING_TIER_FREE, "category": "llm",
        "models": ["custom-model"],
    },
    "kobold": {
        "name": "KoboldAI",
        "description": "Self-hosted KoboldAI Horde / KoboldCPP OpenAI-compatible endpoint",
        "website": "https://koboldai.net", "requires_key": False,
        "key_label": "Base URL", "key_placeholder": "http://localhost:5001/api/v1",
        "default_url": "http://localhost:5001/api/v1",
        "docs": "https://github.com/LostRuins/koboldcpp",
        "powered_by_tagline": "Powered by KoboldAI",
        "pricing_tier": PRICING_TIER_FREE, "category": "llm",
        "models": ["kobold-model"],
    },
    "pollinations": {
        "name": "Pollinations AI",
        "description": "Free, no-signup inference for open-source LLMs",
        "website": "https://pollinations.ai", "requires_key": False,
        "key_label": "", "key_placeholder": "",
        "base_url": "https://text.pollinations.ai/openai",
        "docs": "https://pollinations.ai/docs",
        "powered_by_tagline": "Powered by Pollinations AI",
        "pricing_tier": PRICING_TIER_FREE, "category": "llm",
        "models": ["openai", "mistral", "llama"],
    },
    "nebius": {
        "name": "Nebius AI Studio",
        "description": "GPU cloud inference for open-source models",
        "website": "https://studio.nebius.ai", "requires_key": True,
        "key_label": "API Key", "key_placeholder": "...",
        "base_url": "https://api.studio.nebius.ai/v1",
        "docs": "https://studio.nebius.ai/docs",
        "powered_by_tagline": "Powered by Nebius AI Studio",
        "pricing_tier": PRICING_TIER_FREE_PAID, "category": "llm",
        "models": ["meta-llama/Llama-3.3-70B-Instruct", "deepseek-ai/DeepSeek-V3"],
    },
    # ── Audio / Speech providers (require dedicated endpoints, not chat) ─────────
    "elevenlabs": {
        "name": "ElevenLabs",
        "description": "High-quality text-to-speech and voice cloning",
        "website": "https://elevenlabs.io", "requires_key": True,
        "key_label": "API Key", "key_placeholder": "sk_...",
        "base_url": "https://api.elevenlabs.io/v1",
        "docs": "https://docs.elevenlabs.io",
        "powered_by_tagline": "Powered by ElevenLabs",
        "pricing_tier": PRICING_TIER_FREE_PAID, "category": "audio",
        "models": ["eleven_multilingual_v2", "eleven_flash_v2_5"],
    },
    "assemblyai": {
        "name": "AssemblyAI",
        "description": "Speech-to-text and audio intelligence",
        "website": "https://assemblyai.com", "requires_key": True,
        "key_label": "API Key", "key_placeholder": "...",
        "base_url": "https://api.assemblyai.com/v2",
        "docs": "https://www.assemblyai.com/docs",
        "powered_by_tagline": "Powered by AssemblyAI",
        "pricing_tier": PRICING_TIER_FREE_PAID, "category": "audio",
        "models": ["universal-2", "best"],
    },
    "deepgram": {
        "name": "Deepgram",
        "description": "Fast, accurate speech-to-text and text-to-speech",
        "website": "https://deepgram.com", "requires_key": True,
        "key_label": "API Key", "key_placeholder": "...",
        "base_url": "https://api.deepgram.com/v1",
        "docs": "https://developers.deepgram.com",
        "powered_by_tagline": "Powered by Deepgram",
        "pricing_tier": PRICING_TIER_FREE_PAID, "category": "audio",
        "models": ["nova-2", "nova-2-conversationalai"],
    },
    # ── Image / Video generation providers (require dedicated endpoints) ─────────
    "stability": {
        "name": "Stability AI",
        "description": "Image and video generation models",
        "website": "https://stability.ai", "requires_key": True,
        "key_label": "API Key", "key_placeholder": "sk-...",
        "base_url": "https://api.stability.ai/v2beta",
        "docs": "https://platform.stability.ai/docs",
        "powered_by_tagline": "Powered by Stability AI",
        "pricing_tier": PRICING_TIER_PAID, "category": "image",
        "models": ["stable-image-ultra", "stable-diffusion-3.5-large"],
    },
    "fal": {
        "name": "Fal.ai",
        "description": "Fast image and video generation API",
        "website": "https://fal.ai", "requires_key": True,
        "key_label": "API Key", "key_placeholder": "...",
        "base_url": "https://fal.run",
        "docs": "https://fal.ai/docs",
        "powered_by_tagline": "Powered by Fal.ai",
        "pricing_tier": PRICING_TIER_PAID, "category": "image",
        "models": ["fal-ai/flux/dev", "fal-ai/flux/schnell"],
    },
    "github": {
        "name": "GitHub Models API",
        "description": "Free OpenAI-compatible endpoint for developers via GitHub Tokens",
        "website": "https://github.com/marketplace/models", "requires_key": True,
        "key_label": "GitHub Personal Access Token", "key_placeholder": "ghp_...",
        "base_url": "https://models.inference.ai.azure.com",
        "docs": "https://docs.github.com/en/github-models",
        "powered_by_tagline": "Powered by GitHub Models",
        "pricing_tier": PRICING_TIER_FREE, "category": "llm",
        "models": ["gpt-4o", "meta-llama-3.1-70b-instruct", "Mistral-large"],
    },
    "upstage": {
        "name": "Upstage (Solar)",
        "description": "Creators of the highly efficient Solar LLM — free trial credits",
        "website": "https://upstage.ai", "requires_key": True,
        "key_label": "API Key", "key_placeholder": "up_...",
        "base_url": "https://api.upstage.ai/v1/solar",
        "docs": "https://developers.upstage.ai/docs/getting-started",
        "powered_by_tagline": "Powered by Upstage",
        "pricing_tier": PRICING_TIER_FREE_PAID, "category": "llm",
        "models": ["solar-1-mini-chat", "solar-pro"],
    },
    "shuttleai": {
        "name": "ShuttleAI",
        "description": "Popular free/cheap API aggregator with OpenAI compatibility",
        "website": "https://shuttleai.app", "requires_key": True,
        "key_label": "API Key", "key_placeholder": "shuttle-...",
        "base_url": "https://api.shuttleai.app/v1",
        "docs": "https://docs.shuttleai.app",
        "powered_by_tagline": "Powered by ShuttleAI",
        "pricing_tier": PRICING_TIER_FREE, "category": "llm",
        "models": ["shuttle-1", "gpt-4o-mini-free"],
    },
    "clarifai": {
        "name": "Clarifai",
        "description": "Enterprise platform with generous 1,000 free operations/month",
        "website": "https://clarifai.com", "requires_key": True,
        "key_label": "Personal Access Token", "key_placeholder": "PAT...",
        "base_url": "https://api.clarifai.com/v2/users/openai/apps/chat/models",
        "docs": "https://docs.clarifai.com",
        "powered_by_tagline": "Powered by Clarifai",
        "pricing_tier": PRICING_TIER_FREE, "category": "llm",
        "models": ["gpt-4", "llama-3-70b-instruct"],
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
    "vllm": OpenAICompatProvider,
    "kobold": OpenAICompatProvider,
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
    "replicate": OpenAICompatProvider,
    "deepinfra": OpenAICompatProvider,
    "novita": OpenAICompatProvider,
    "siliconflow": OpenAICompatProvider,
    "zhipu": OpenAICompatProvider,
    "moonshot": OpenAICompatProvider,
    "alibaba": OpenAICompatProvider,
    "cloudflare": OpenAICompatProvider,
    "pollinations": OpenAICompatProvider,
    "nebius": OpenAICompatProvider,
    "github": OpenAICompatProvider,
    "upstage": OpenAICompatProvider,
    "shuttleai": OpenAICompatProvider,
    "clarifai": OpenAICompatProvider,
}


def get_provider(provider_id: str, key: str = "", base_url: str = "", model: str = "") -> BaseProvider:
    """Factory: return instantiated provider."""
    cls = PROVIDER_CLASSES.get(provider_id, OpenAICompatProvider)
    if provider_id in PROVIDER_REGISTRY:
        reg = PROVIDER_REGISTRY[provider_id]
        if not base_url:
            base_url = reg.get("base_url", "")
            if provider_id in ("ollama", "gpt4all", "localai", "llamacpp", "vllm", "kobold"):
                base_url = reg.get("default_url", base_url)
        if not model and "models" in reg and reg["models"]:
            model = reg["models"][0]
    return cls(key=key, base_url=base_url, model=model)


# ---------------------------------------------------------------------------
# Marketplace manager & Smart Routing
# ---------------------------------------------------------------------------

def get_fallback_providers() -> list[tuple[BaseProvider, str]]:
    pool = []
    ENV_PROVIDER_MAP = {
        "OPENAI_API_KEY": "openai",
        "ANTHROPIC_API_KEY": "anthropic",
        "GEMINI_API_KEY": "google",
        "GROQ_API_KEY": "groq",
        "DEEPSEEK_API_KEY": "deepseek",
        "CEREBRAS_API_KEY": "cerebras",
        "MISTRAL_API_KEY": "mistral",
        "OPENROUTER_API_KEY": "openrouter",
        "HUGGINGFACE_API_KEY": "huggingface",
        "COHERE_API_KEY": "cohere",
        "NVIDIA_API_KEY": "nvidia_nim",
        "FIREWORKS_API_KEY": "fireworks",
        "XAI_API_KEY": "xai",
        "REPLICATE_API_TOKEN": "replicate",
        "DEEPINFRA_API_KEY": "deepinfra",
        "NOVITA_API_KEY": "novita",
        "AI21_API_KEY": "ai21",
        "MOONSHOT_API_KEY": "moonshot",
        "CLOUDFLARE_API_KEY": "cloudflare",
        "SAMBANOVA_API_KEY": "sambanova",
        "GITHUB_MODELS_API_KEY": "github",
        "UPSTAGE_API_KEY": "upstage",
        "SHUTTLEAI_API_KEY": "shuttleai",
        "CLARIFAI_API_KEY": "clarifai",
    }
    for env_var, pid in ENV_PROVIDER_MAP.items():
        key = os.environ.get(env_var, "").strip()
        if key:
            pool.append((get_provider(pid, key=key), pid))
            
    # Also add default if it exists
    default_key = os.environ.get("DEFAULT_LLM_KEY", "").strip()
    if default_key:
        default_provider = os.environ.get("DEFAULT_LLM_PROVIDER", "openai").strip()
        default_model = os.environ.get("DEFAULT_LLM_MODEL", "").strip()
        pool.append((get_provider(default_provider, key=default_key, model=default_model), default_provider))
        
    return pool

class FallbackRouterProvider(BaseProvider):
    def __init__(self, providers: list[tuple[BaseProvider, str]]):
        super().__init__()
        self.providers = providers
        self.active_pid = "router"
        self.model = "auto"

    @property
    def name(self) -> str:
        return "Fallback Router"

    async def chat(self, system_prompt: str, user_prompt: str, max_tokens: int = 1024) -> str:
        last_err = None
        for provider, pid in self.providers:
            try:
                reply = await provider.chat(system_prompt, user_prompt, max_tokens)
                self.active_pid = pid
                self.model = provider.model
                return reply
            except Exception as e:
                logger.warning("Provider %s failed: %s", pid, e)
                last_err = e
        raise RuntimeError(f"All fallback providers failed. Last error: {last_err}")
        
    async def chat_with_image(self, system_prompt: str, user_prompt: str, image_b64: str, mime: str, max_tokens: int = 1024) -> str:
        last_err = None
        for provider, pid in self.providers:
            try:
                reply = await provider.chat_with_image(system_prompt, user_prompt, image_b64, mime, max_tokens)
                self.active_pid = pid
                self.model = provider.model
                return reply
            except Exception as e:
                logger.warning("Provider %s failed image chat: %s", pid, e)
                last_err = e
        raise RuntimeError(f"All fallback providers failed image chat. Last error: {last_err}")


class AIMarketplace:
    """Routes LLM calls to the user's selected provider."""

    def __init__(self):
        self.db = None

    async def get_active_provider(self, user_id: str) -> tuple[BaseProvider, str] | tuple[None, str]:
        """Return (provider, provider_id) for the given user, or (None, '').
        Falls back to a smart router using all available .env keys when no user-level config exists."""
        try:
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
        except Exception as e:
            logger.warning("Failed to fetch user provider from DB, falling back to smart router: %s", e)

        pool = get_fallback_providers()

        # Platform-wide default configured by admin via Settings → Default LLM
        try:
            from settings_service import get_default_llm_config
            llm_cfg = await get_default_llm_config()
            if llm_cfg:
                default_key = llm_cfg.get("key", "").strip()
                if default_key:
                    default_provider = llm_cfg.get("provider", "openai").strip()
                    default_model = llm_cfg.get("model", "").strip()
                    pool.insert(0, (get_provider(default_provider, key=default_key, model=default_model), default_provider))
        except Exception:
            pass

        if pool:
            return FallbackRouterProvider(pool), "router"

        return None, ""

    async def _estimate_and_track_usage(self, user_id: str, prompt_text: str, reply_text: str) -> None:
        try:
            from datetime import date
            today_str = date.today().isoformat()
            # Simple length-based estimation
            est_tokens = (len(prompt_text) + len(reply_text)) // 4
            
            await self.db["ai_token_usage"].update_one(
                {"user_id": user_id, "date": today_str},
                {"$inc": {"tokens_used": est_tokens}},
                upsert=True
            )
        except Exception as e:
            logger.warning("Failed to track token usage: %s", e)

    async def _check_quota(self, user_id: str) -> bool:
        """Returns True if user has free tokens remaining."""
        try:
            from datetime import date
            today_str = date.today().isoformat()
            
            limit = int(os.environ.get("DAILY_FREE_TOKENS_PER_USER", "10000"))
            doc = await self.db["ai_token_usage"].find_one({"user_id": user_id, "date": today_str})
            if not doc:
                return True
                
            return doc.get("tokens_used", 0) < limit
        except Exception as e:
            logger.warning("Failed to check token quota: %s", e)
            return True # Fail open on DB errors

    async def chat(self, user_id: str, system_prompt: str, user_prompt: str, max_tokens: int = 1024) -> str:
        provider, pid = await self.get_active_provider(user_id)
        
        # 1. Tier 0: User BYOK (Not Fallback Router)
        if provider and not isinstance(provider, FallbackRouterProvider):
            return await provider.chat(system_prompt, user_prompt, max_tokens)
            
        # 2. Tier 1: Free Token Pool (Fallback Router)
        has_quota = await self._check_quota(user_id)
        if has_quota and provider is not None:
            try:
                reply = await provider.chat(system_prompt, user_prompt, max_tokens)
                await self._estimate_and_track_usage(user_id, system_prompt + user_prompt, reply)
                return reply
            except Exception as e:
                logger.warning("Tier 1 free pool failed: %s", e)
                # Fall through to Tier 2
                
        # 3. Tier 2: Local LLM Fallback
        try:
            from local_llm import local_chat_with_info
            reply_dict = await local_chat_with_info(user_prompt, context=system_prompt)
            content = reply_dict.get("content", "").strip()
            if content:
                return content
        except Exception as e:
            logger.warning("Tier 2 local LLM failed: %s", e)
            
        # 4. Tier 3: Exhausted / Unavailable -> BYOK Prompt
        raise RuntimeError("Daily free token limit reached and local fallback is unavailable. Please configure your own API key in Settings (BYOK).")

    async def chat_with_info(self, user_id: str, system_prompt: str, user_prompt: str, max_tokens: int = 1024) -> tuple[str, dict]:
        """Returns (reply_text, provider_info) so callers can include the tagline."""
        provider, pid = await self.get_active_provider(user_id)
        
        # 1. Tier 0: User BYOK
        if provider and not isinstance(provider, FallbackRouterProvider):
            reply = await provider.chat(system_prompt, user_prompt, max_tokens)
            meta = PROVIDER_REGISTRY.get(pid, {})
            provider_info = {
                "id": pid,
                "name": meta.get("name", pid),
                "model": provider.model,
                "powered_by_tagline": meta.get("powered_by_tagline", f"Powered by {meta.get('name', pid)} in Association with We Hive"),
            }
            return reply, provider_info
            
        # 2. Tier 1: Free Token Pool
        has_quota = await self._check_quota(user_id)
        if has_quota and provider is not None:
            try:
                reply = await provider.chat(system_prompt, user_prompt, max_tokens)
                await self._estimate_and_track_usage(user_id, system_prompt + user_prompt, reply)
                
                active_pid = provider.active_pid if isinstance(provider, FallbackRouterProvider) else pid
                meta = PROVIDER_REGISTRY.get(active_pid, {})
                provider_info = {
                    "id": active_pid,
                    "name": meta.get("name", active_pid),
                    "model": provider.model,
                    "powered_by_tagline": meta.get("powered_by_tagline", f"Powered by {meta.get('name', active_pid)} in Association with We Hive"),
                }
                return reply, provider_info
            except Exception as e:
                logger.warning("Tier 1 free pool failed: %s", e)
                
        # 3. Tier 2: Local LLM Fallback
        try:
            from local_llm import local_chat_with_info
            reply_dict = await local_chat_with_info(user_prompt, context=system_prompt)
            content = reply_dict.get("content", "").strip()
            if content:
                provider_info = {
                    "id": "local",
                    "name": "Local Assistant",
                    "model": "offline",
                    "powered_by_tagline": "Powered by Local LLM (Free Quota Exceeded)",
                }
                return content, provider_info
        except Exception as e:
            logger.warning("Tier 2 local LLM failed: %s", e)
            
        # 4. Tier 3: Exhausted
        raise RuntimeError("Daily free token limit reached and local fallback is unavailable. Please configure your own API key in Settings (BYOK).")

    async def chat_with_image(self, user_id: str, system_prompt: str, user_prompt: str, image_b64: str, mime: str, max_tokens: int = 1024) -> str:
        provider, pid = await self.get_active_provider(user_id)
        
        # 1. Tier 0: User BYOK
        if provider and not isinstance(provider, FallbackRouterProvider):
            return await provider.chat_with_image(system_prompt, user_prompt, image_b64, mime, max_tokens)
            
        # 2. Tier 1: Free Token Pool
        has_quota = await self._check_quota(user_id)
        if has_quota and provider is not None:
            try:
                reply = await provider.chat_with_image(system_prompt, user_prompt, image_b64, mime, max_tokens)
                await self._estimate_and_track_usage(user_id, system_prompt + user_prompt, reply)
                return reply
            except Exception as e:
                logger.warning("Tier 1 free pool image chat failed: %s", e)
                
        # (Local LLM image fallback not supported, go straight to BYOK)
        raise RuntimeError("Daily free token limit reached or free vision models unavailable. Please configure your own API key in Settings (BYOK).")


marketplace = AIMarketplace()
