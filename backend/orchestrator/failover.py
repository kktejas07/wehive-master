"""Failover chain & circuit breaker for provider routing.
Priority order: token availability > provider reliability > cost.
Circuit breaker: pauses providers returning 429/5xx for 5 minutes.
Permanently disables providers returning 401/403 (invalid credentials).
"""

import asyncio
import logging
import time
from collections import defaultdict
from typing import Optional

from core.db import db
from orchestrator.models import CircuitState
from orchestrator.vault import PROVIDER_BASE_URLS, AccountsVault

logger = logging.getLogger(__name__)

FAILOVER_CHAIN = [
    "omniroute",
    "groq",
    "deepseek",
    "cerebras",
    "mistral",
    "openrouter",
    "google",
    "openai",
    "anthropic",
    "together",
    "perplexity",
    "nvidia_nim",
    "cohere",
    "ai21",
    "huggingface",
    "fireworks",
    "xai",
    "replicate",
    "elevenlabs",
    "assemblyai",
    "deepinfra",
    "novita",
    "stability",
    "fal",
    "ollama",
    "moonshot",
    "lemonfox",
    "deepgram",
    "alibaba",
    "zhipu",
    "cloudflare",
    "sambanova",
    "localai",
    "kobold",
    "pollinations",
    "nebius",
    "siliconflow",
]

CIRCUIT_BREAKER_PAUSE_SECS = 300
CIRCUIT_BREAKER_THRESHOLD = 3
CIRCUIT_HALF_OPEN_TIMEOUT = 60

CB_COLLECTION = "orchestrator_circuit_breakers"


def _capture_event(event: str, distinct_id: str, properties: dict) -> None:
    try:
        from posthog_service import capture_event
        capture_event(event=event, distinct_id=distinct_id, properties=properties)
    except Exception:
        pass


class CircuitBreaker:
    """Per-provider circuit breaker with MongoDB persistence."""

    def __init__(self, _db=None):
        self._circuits: dict[str, CircuitState] = defaultdict(CircuitState)
        self._db = _db
        self._loaded = False

    async def _ensure_loaded(self):
        if self._loaded:
            return
        if self._db is None:
            self._db = db
        if self._db is not None:
            try:
                docs = await self._db[CB_COLLECTION].find({}).to_list(200)
                for doc in docs:
                    provider = doc.get("provider", "")
                    if not provider:
                        continue
                    state = self._circuits[provider]
                    state.state = doc.get("state", "CLOSED")
                    state.failures = doc.get("failures", 0)
                    state.last_failure = doc.get("last_failure", 0.0)
                    state.paused_until = doc.get("paused_until", 0.0)
                    state.permanently_disabled = doc.get("permanently_disabled", False)
                logger.info("Restored %d circuit breaker states from MongoDB", len(docs))
            except Exception as e:
                logger.warning("Failed to restore circuit breaker states: %s", e)
        self._loaded = True

    async def _persist(self, provider: str) -> None:
        if self._db is None:
            return
        state = self._circuits[provider.lower()]
        try:
            await self._db[CB_COLLECTION].update_one(
                {"provider": provider.lower()},
                {
                    "$set": {
                        "provider": provider.lower(),
                        "state": state.state,
                        "failures": state.failures,
                        "last_failure": state.last_failure,
                        "paused_until": state.paused_until,
                        "permanently_disabled": state.permanently_disabled,
                    }
                },
                upsert=True,
            )
        except Exception:
            pass

    def allow(self, provider: str) -> bool:
        state = self._circuits[provider.lower()]
        if getattr(state, "permanently_disabled", False):
            return False
        if state.state == "CLOSED":
            return True
        if state.state == "OPEN":
            if time.monotonic() >= state.paused_until:
                state.state = "HALF_OPEN"
                logger.info("Circuit HALF_OPEN for %s, allowing probe", provider)
                return True
            return False
        if state.state == "HALF_OPEN":
            return True
        return True

    async def record_success(self, provider: str) -> None:
        await self._ensure_loaded()
        state = self._circuits[provider.lower()]
        previous_state = state.state
        state.failures = 0
        if state.state == "HALF_OPEN":
            state.state = "CLOSED"
            state.permanently_disabled = False
            logger.info("Circuit CLOSED for %s", provider)
        await self._persist(provider)

        if state.state != previous_state:
            _capture_event(
                "orchestrator_circuit_change",
                "system",
                {
                    "provider": provider,
                    "previous_state": previous_state,
                    "new_state": state.state,
                    "failure_count": state.failures,
                },
            )

    async def record_failure(self, provider: str, status_code: int = 500) -> None:
        await self._ensure_loaded()
        state = self._circuits[provider.lower()]
        previous_state = state.state
        state.failures += 1
        state.last_failure = time.monotonic()

        if status_code in (401, 403):
            state.state = "OPEN"
            state.paused_until = float("inf")
            state.permanently_disabled = True
            logger.warning(
                "Circuit PERMANENTLY DISABLED for %s (%d — invalid credentials)",
                provider,
                status_code,
            )
        elif status_code == 429:
            state.state = "OPEN"
            state.paused_until = time.monotonic() + CIRCUIT_BREAKER_PAUSE_SECS
            logger.warning(
                "Circuit OPEN for %s (429 rate limit) — paused %ds",
                provider,
                CIRCUIT_BREAKER_PAUSE_SECS,
            )
        elif state.failures >= CIRCUIT_BREAKER_THRESHOLD:
            state.state = "OPEN"
            state.paused_until = time.monotonic() + CIRCUIT_BREAKER_PAUSE_SECS
            logger.warning(
                "Circuit OPEN for %s (%d failures) — paused %ds",
                provider,
                state.failures,
                CIRCUIT_BREAKER_PAUSE_SECS,
            )
        elif state.state == "HALF_OPEN":
            state.state = "OPEN"
            state.paused_until = time.monotonic() + CIRCUIT_BREAKER_PAUSE_SECS

        await self._persist(provider)

        if state.state != previous_state:
            _capture_event(
                "orchestrator_circuit_change",
                "system",
                {
                    "provider": provider,
                    "previous_state": previous_state,
                    "new_state": state.state,
                    "failure_count": state.failures,
                    "status_code": status_code,
                    "permanently_disabled": state.permanently_disabled,
                },
            )

    def get_state(self, provider: str) -> dict:
        state = self._circuits[provider.lower()]
        return {
            "provider": provider,
            "state": state.state,
            "failures": state.failures,
            "paused_until": state.paused_until if state.state == "OPEN" else 0,
            "permanently_disabled": getattr(state, "permanently_disabled", False),
        }

    def get_all_states(self) -> list[dict]:
        return [self.get_state(p) for p in self._circuits]


class FailoverRouter:
    """Routes requests through providers in priority order with circuit breaker."""

    def __init__(self, token_pool=None, breaker: Optional[CircuitBreaker] = None):
        self.token_pool = token_pool
        self.breaker = breaker or CircuitBreaker()
        self._rr_counters: dict[str, int] = defaultdict(int)

    async def get_next_provider(
        self,
        available_accounts: list[dict],
        requested_model: str = "",
        capability_filter: str = "llm",
    ) -> Optional[str]:
        """Select best provider by model match, tokens, priority, capabilities."""
        await self.breaker._ensure_loaded()

        if not available_accounts:
            return None

        candidates = []
        for acct in available_accounts:
            provider = acct.get("provider", "")
            if not self.breaker.allow(provider):
                continue
            if not acct.get("api_key"):
                continue
            caps = acct.get("capabilities", ["llm"])
            if capability_filter and capability_filter not in caps:
                continue
            if requested_model and acct.get("models"):
                has_model = any(
                    requested_model.lower() in m.lower() or m.lower() in requested_model.lower()
                    for m in acct["models"]
                )
                if not has_model and not acct.get("free_tier", False):
                    continue
            candidates.append(acct)

        if not candidates:
            return None

        candidates.sort(
            key=lambda a: (
                0 if a.get("tokens_allocated", 0) == 0 or a.get("free_tier") else 1,
                -(a.get("tokens_allocated", 0) - a.get("tokens_used", 0)),
                a.get("priority", 99),
            )
        )

        return candidates[0]["provider"]

    async def route_request(
        self,
        requested_model: str,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        capability: str = "llm",
    ) -> tuple[dict, str, list[str]]:
        await self.breaker._ensure_loaded()
        vault = AccountsVault()
        available = await vault.get_available_accounts()
        attempted = []

        for provider_key in FAILOVER_CHAIN:
            if not self.breaker.allow(provider_key):
                attempted.append(f"{provider_key}(circuit_open)")
                continue

            acct = next((a for a in available if a.get("provider") == provider_key), None)
            if not acct or not acct.get("api_key"):
                attempted.append(f"{provider_key}(no_account)")
                continue

            caps = acct.get("capabilities", ["llm"])
            if capability and capability not in caps:
                attempted.append(f"{provider_key}(cap_mismatch)")
                continue

            attempted.append(provider_key)
            result, status_code = await self._call_provider(
                provider_key,
                acct["api_key"],
                acct.get("base_url", ""),
                requested_model,
                messages,
                temperature,
                max_tokens,
            )

            if result:
                await self.breaker.record_success(provider_key)
                return result, provider_key, attempted

            await self.breaker.record_failure(provider_key, status_code)

        raise RuntimeError(f"All providers failed. Attempted: {attempted}")

    async def _call_provider(
        self,
        provider: str,
        api_key: str,
        base_url: str,
        model: str,
        messages: list[dict],
        temperature: float,
        max_tokens: int,
    ) -> tuple[Optional[dict], int]:
        import httpx

        url_base = base_url or PROVIDER_BASE_URLS.get(provider, "")
        if not url_base:
            return None, 0

        if provider == "cloudflare":
            url = f"{url_base.rstrip('/')}/ai/run/{model}"
        else:
            url = f"{url_base.rstrip('/')}/chat/completions"

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        if provider == "openrouter":
            headers["HTTP-Referer"] = "https://wehive.co.in"
            headers["X-Title"] = "We Hive"

        if provider == "cloudflare":
            payload = {
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
            }
        else:
            payload = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            }

        max_retries = 2

        for attempt in range(max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    resp = await client.post(url, json=payload, headers=headers)

                    if resp.status_code == 200:
                        if provider == "cloudflare":
                            cf_data = resp.json()
                            cf_result = cf_data.get("result", {})
                            return {
                                "id": f"cf-{cf_result.get('id', '')}",
                                "object": "chat.completion",
                                "model": model,
                                "choices": [
                                    {
                                        "index": 0,
                                        "message": {
                                            "role": "assistant",
                                            "content": cf_result.get("response", ""),
                                        },
                                        "finish_reason": "stop",
                                    }
                                ],
                                "usage": {
                                    "total_tokens": 0,
                                    "prompt_tokens": 0,
                                    "completion_tokens": 0,
                                },
                            }, 200
                        return resp.json(), 200
                    elif resp.status_code == 429:
                        logger.warning("Rate limited by %s: 429", provider)
                        return None, 429
                    elif resp.status_code in (401, 403):
                        logger.warning("Auth failed for %s: %s", provider, resp.status_code)
                        return None, resp.status_code
                    elif resp.status_code >= 500:
                        logger.warning("Server error from %s: %s", provider, resp.status_code)
                        return None, resp.status_code
                    else:
                        logger.warning(
                            "Provider %s returned %s: %s",
                            provider,
                            resp.status_code,
                            resp.text[:200],
                        )
                        return None, resp.status_code
            except (httpx.ConnectError, httpx.TimeoutException, httpx.RemoteProtocolError) as e:
                if attempt < max_retries:
                    delay = 1.0 * (2 ** attempt)
                    logger.info(
                        "Retrying %s (attempt %d/%d) after: %s",
                        provider,
                        attempt + 1,
                        max_retries,
                        e,
                    )
                    await asyncio.sleep(delay)
                else:
                    logger.warning(
                        "Provider %s call failed after %d attempts: %s",
                        provider,
                        max_retries + 1,
                        e,
                    )
            except Exception as e:
                logger.warning("Provider %s call failed: %s", provider, e)
                return None, 0

        return None, 0
