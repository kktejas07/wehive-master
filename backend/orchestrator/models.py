"""Data models for the AI Orchestrator."""

from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class ProviderAccount:
    provider: str
    api_key: str  # encrypted at rest
    account_email: str = ""
    tokens_allocated: int = 0
    tokens_used: int = 0
    refresh_date: str = ""  # ISO date
    status: str = "ACTIVE"  # ACTIVE, EXHAUSTED, DISABLED
    priority: int = 10
    models: list[str] = field(default_factory=list)
    extra_headers: dict = field(default_factory=dict)
    base_url: str = ""
    free_tier: bool = False
    trial_credits: float = 0.0
    trial_expiry: str = ""
    capabilities: list[str] = field(default_factory=lambda: ["llm"])


@dataclass
class UsageRecord:
    account_id: str
    provider: str
    model: str
    tokens_consumed: int
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    request_id: str = ""
    status: str = "success"
    cost_usd: float = 0.0


@dataclass
class FailoverEvent:
    request_id: str
    attempted_providers: list[str]
    final_provider: str
    reason: str
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@dataclass
class BudgetTransition:
    provider: str
    from_status: str
    to_status: str
    tokens_used: int
    tokens_limit: int
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@dataclass
class CircuitState:
    provider: str = ""
    failures: int = 0
    last_failure: float = 0.0
    paused_until: float = 0.0
    state: str = "CLOSED"
    permanently_disabled: bool = False
