"""Token budget enforcement — tracks cumulative usage, marks exhausted accounts,
triggers alerts at 80% and 95% thresholds, and sends admin notifications on exhaustion.
"""

import logging
from datetime import datetime, timezone

from orchestrator.vault import AccountsVault

logger = logging.getLogger(__name__)

EXHAUSTION_THRESHOLD = 0.95
WARNING_THRESHOLD = 0.80


async def _notify_budget_exhaustion(
    provider: str, pct_used: float, tokens_used: int, tokens_allocated: int
) -> None:
    try:
        from posthog_service import capture_event
        capture_event(
            event="orchestrator_budget_exhausted",
            distinct_id="system",
            properties={
                "provider": provider,
                "pct_used": round(pct_used * 100, 1),
                "tokens_used": tokens_used,
                "tokens_allocated": tokens_allocated,
                "action_required": "rotate_or_increase_quota",
            },
        )
    except Exception:
        pass

    logger.warning(
        "BUDGET EXHAUSTION NOTIFICATION: provider=%s pct=%.1f%% used=%d/%d — "
        "admin action required: rotate API key or increase quota",
        provider,
        pct_used * 100,
        tokens_used,
        tokens_allocated,
    )

    try:
        from alerting_service import get_alerting_service_sync
        import asyncio as _asyncio

        _alerting = get_alerting_service_sync()
        _asyncio.ensure_future(
            _alerting.send_alert(
                alert_type="budget_exhaustion",
                severity="critical",
                title=f"Provider Budget Exhausted: {provider}",
                message=(
                    f"Provider '{provider}' has exhausted its token budget at "
                    f"{pct_used*100:.1f}% ({tokens_used:,}/{tokens_allocated:,} tokens). "
                    "Action required: rotate API key or increase quota."
                ),
                metadata={
                    "provider": provider,
                    "pct_used": round(pct_used * 100, 1),
                    "tokens_used": tokens_used,
                    "tokens_allocated": tokens_allocated,
                    "action_required": "rotate_or_increase_quota",
                },
            )
        )
    except Exception:
        pass


class BudgetEnforcer:
    """Enforces per-provider token budgets and triggers state transitions."""

    def __init__(self, vault=None, token_pool=None):
        self.vault = vault
        self.token_pool = token_pool

    async def _get_vault(self):
        if self.vault is None:
            self.vault = AccountsVault()
        return self.vault

    async def check_and_enforce(self) -> list[dict]:
        """Check all active accounts for budget thresholds. Returns alerts triggered."""
        vault = await self._get_vault()
        alerts = []
        accounts = await vault.list_accounts()

        for acct in accounts:
            provider = acct.get("provider", "")
            allocated = acct.get("tokens_allocated", 0)
            if allocated <= 0:
                continue

            used = acct.get("tokens_used", 0)
            pct = used / allocated

            if pct >= EXHAUSTION_THRESHOLD and acct.get("status") != "EXHAUSTED":
                await vault.set_status(provider, "EXHAUSTED")
                if self.token_pool:
                    await self.token_pool.log_budget_transition(
                        provider, "ACTIVE", "EXHAUSTED", used, allocated
                    )
                alerts.append(
                    {
                        "provider": provider,
                        "level": "CRITICAL",
                        "message": f"{provider} exhausted at {pct*100:.1f}% ({used}/{allocated} tokens)",
                        "pct_used": round(pct * 100, 1),
                    }
                )
                logger.warning("BUDGET EXHAUSTED: %s at %.1f%%", provider, pct * 100)
                await _notify_budget_exhaustion(provider, pct, used, allocated)
            elif pct >= WARNING_THRESHOLD:
                alerts.append(
                    {
                        "provider": provider,
                        "level": "WARNING",
                        "message": f"{provider} at {pct*100:.1f}% ({used}/{allocated} tokens)",
                        "pct_used": round(pct * 100, 1),
                    }
                )

        return alerts

    async def pre_check(self, provider: str, estimated_tokens: int) -> bool:
        """Check if a provider can handle an estimated token request."""
        vault = await self._get_vault()
        acct = await vault.get_account(provider)
        if not acct:
            return False

        if acct.get("free_tier"):
            return True

        allocated = acct.get("tokens_allocated", 0)
        if allocated <= 0:
            return True

        used = acct.get("tokens_used", 0)
        remaining = allocated - used

        if remaining <= 0:
            return False

        if remaining < estimated_tokens * 1.1:
            logger.info(
                "Provider %s has %d tokens remaining, need ~%d",
                provider,
                remaining,
                estimated_tokens,
            )
            return False

        return True

    async def get_budget_alerts(self) -> list[dict]:
        """Get current budget status for all accounts."""
        vault = await self._get_vault()
        accounts = await vault.list_accounts()
        alerts = []
        for acct in accounts:
            allocated = acct.get("tokens_allocated", 0)
            used = acct.get("tokens_used", 0)
            pct = (used / allocated * 100) if allocated > 0 else 0
            alerts.append(
                {
                    "provider": acct.get("provider", ""),
                    "status": acct.get("status", ""),
                    "tokens_used": used,
                    "tokens_allocated": allocated,
                    "tokens_remaining": max(0, allocated - used),
                    "pct_used": round(pct, 1),
                    "free_tier": acct.get("free_tier", False),
                }
            )
        return alerts

    async def refresh_due_accounts(self) -> list[dict]:
        """Refresh any accounts whose refresh date has passed."""
        vault = await self._get_vault()
        refreshed = await vault.refresh_expired_accounts()
        results = []
        for provider in refreshed:
            results.append(
                {
                    "provider": provider,
                    "action": "refreshed",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            )
            if self.token_pool:
                await self.token_pool.log_budget_transition(
                    provider, "EXHAUSTED", "ACTIVE", 0, 0
                )
        return results
