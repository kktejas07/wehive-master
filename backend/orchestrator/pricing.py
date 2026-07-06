"""Token estimation and cost calculation helpers for the orchestrator."""

import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Approximate per-1K-token pricing in USD (input / output).
# These are conservative defaults; override via account-level settings if needed.
PROVIDER_PRICING: dict[str, dict[str, float]] = {
    "openai": {"input": 0.0025, "output": 0.0100},
    "openai_gpt4o_mini": {"input": 0.00015, "output": 0.0006},
    "anthropic": {"input": 0.0030, "output": 0.0150},
    "google": {"input": 0.00035, "output": 0.0014},
    "groq": {"input": 0.0, "output": 0.0},
    "deepseek": {"input": 0.00027, "output": 0.0011},
    "mistral": {"input": 0.0020, "output": 0.0060},
    "cohere": {"input": 0.0015, "output": 0.0060},
    "xai": {"input": 0.0020, "output": 0.0100},
    "perplexity": {"input": 0.0020, "output": 0.0080},
    "openrouter": {"input": 0.0, "output": 0.0},
    "huggingface": {"input": 0.0, "output": 0.0},
    "together": {"input": 0.0018, "output": 0.0018},
    "fireworks": {"input": 0.0020, "output": 0.0020},
    "cerebras": {"input": 0.0, "output": 0.0},
    "ai21": {"input": 0.0020, "output": 0.0080},
    "nvidia_nim": {"input": 0.0, "output": 0.0},
    "azure": {"input": 0.0050, "output": 0.0150},
    "bedrock": {"input": 0.0030, "output": 0.0150},
    "replicate": {"input": 0.0, "output": 0.0},
    "deepinfra": {"input": 0.0009, "output": 0.0009},
    "novita": {"input": 0.0008, "output": 0.0008},
    "siliconflow": {"input": 0.0005, "output": 0.0005},
    "zhipu": {"input": 0.0007, "output": 0.0007},
    "moonshot": {"input": 0.0020, "output": 0.0080},
    "alibaba": {"input": 0.0007, "output": 0.0007},
    "cloudflare": {"input": 0.0, "output": 0.0},
    "pollinations": {"input": 0.0, "output": 0.0},
    "nebius": {"input": 0.0007, "output": 0.0007},
    "omniroute": {"input": 0.0, "output": 0.0},
    "ollama": {"input": 0.0, "output": 0.0},
    "localai": {"input": 0.0, "output": 0.0},
    "vllm": {"input": 0.0, "output": 0.0},
    "llamacpp": {"input": 0.0, "output": 0.0},
    "gpt4all": {"input": 0.0, "output": 0.0},
    "kobold": {"input": 0.0, "output": 0.0},
    "elevenlabs": {"input": 0.0, "output": 0.0},
    "assemblyai": {"input": 0.0, "output": 0.0},
    "deepgram": {"input": 0.0, "output": 0.0},
    "stability": {"input": 0.0, "output": 0.0},
    "fal": {"input": 0.0, "output": 0.0},
}


def _tiktoken_encode(text: str, model: str = "gpt-4o") -> list[int]:
    try:
        import tiktoken
        enc = tiktoken.encoding_for_model(model)
    except Exception:
        try:
            enc = tiktoken.get_encoding("cl100k_base")
        except Exception:
            return []
    return enc.encode(text or "")


def estimate_tokens(messages: list[dict], model: str = "gpt-4o") -> int:
    """Estimate token count from a list of OpenAI-style messages."""
    total = 0
    for m in messages:
        content = m.get("content") or ""
        if isinstance(content, str):
            total += len(_tiktoken_encode(content, model))
        elif isinstance(content, list):
            for part in content:
                if isinstance(part, dict):
                    text = part.get("text") or ""
                    total += len(_tiktoken_encode(text, model))
    # Add a small overhead for message formatting.
    return max(1, total + len(messages) * 3)


def estimate_text_tokens(text: str, model: str = "gpt-4o") -> int:
    return max(1, len(_tiktoken_encode(text, model)))


def calculate_cost(
    provider: str,
    prompt_tokens: int,
    completion_tokens: int,
    model: Optional[str] = None,
) -> float:
    """Return estimated USD cost for a provider call."""
    rates = PROVIDER_PRICING.get(provider)
    if rates is None:
        # Try model-specific fallback naming in MODEL_PROFILES style.
        rates = PROVIDER_PRICING.get(f"{provider}_{model}", {"input": 0.0, "output": 0.0})
    input_rate = rates.get("input", 0.0)
    output_rate = rates.get("output", 0.0)
    cost = (prompt_tokens / 1000.0 * input_rate) + (completion_tokens / 1000.0 * output_rate)
    return round(cost, 6)


def get_pricing(provider: str, model: Optional[str] = None) -> dict[str, float]:
    rates = PROVIDER_PRICING.get(provider) or PROVIDER_PRICING.get(f"{provider}_{model}")
    return rates or {"input": 0.0, "output": 0.0}
