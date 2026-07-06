"""Token Pool Manager — tracks token consumption per provider/account."""

import logging
from datetime import datetime, timedelta, timezone


from db import db
from orchestrator.vault import AccountsVault

logger = logging.getLogger(__name__)

USAGE_COLLECTION = "orchestrator_token_usage"
FAILOVER_COLLECTION = "orchestrator_failover_log"
BUDGET_COLLECTION = "orchestrator_budget_log"


class TokenPoolManager:
    """Manages token allocation, usage tracking, and account selection."""

    def __init__(self, _db=None):
        self.db = _db or db
        self.vault = AccountsVault(_db)

    def _usage_col(self):
        return self.db[USAGE_COLLECTION]

    def _failover_col(self):
        return self.db[FAILOVER_COLLECTION]

    def _budget_col(self):
        return self.db[BUDGET_COLLECTION]

    async def ensure_indexes(self) -> None:
        for col, keys in [
            (self._usage_col(), [("timestamp", -1)]),
            (self._usage_col(), [("provider", 1), ("timestamp", -1)]),
            (self._usage_col(), [("request_id", 1)]),
            (self._failover_col(), [("timestamp", -1)]),
            (self._budget_col(), [("timestamp", -1)]),
        ]:
            try:
                await col.create_index(keys, background=True)
            except Exception:
                pass

    async def log_usage(
        self,
        provider: str,
        model: str,
        tokens: int,
        request_id: str = "",
        status: str = "success",
        cost_usd: float = 0.0,
    ) -> None:
        doc = {
            "provider": (provider or "").lower(),
            "model": model or "",
            "tokens_consumed": int(tokens),
            "request_id": request_id or "",
            "status": status,
            "cost_usd": round(cost_usd, 6),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        try:
            await self._usage_col().insert_one(doc)
        except Exception as e:
            logger.warning("Failed to log usage: %s", e)

    async def log_failover(
        self,
        request_id: str,
        attempted: list[str],
        final_provider: str,
        reason: str,
    ) -> None:
        doc = {
            "request_id": request_id,
            "attempted_providers": list(attempted),
            "final_provider": final_provider,
            "reason": reason,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        try:
            await self._failover_col().insert_one(doc)
        except Exception as e:
            logger.warning("Failed to log failover: %s", e)

    async def log_budget_transition(
        self,
        provider: str,
        from_status: str,
        to_status: str,
        tokens_used: int,
        tokens_limit: int,
    ) -> None:
        doc = {
            "provider": provider,
            "from_status": from_status,
            "to_status": to_status,
            "tokens_used": int(tokens_used),
            "tokens_limit": int(tokens_limit),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        try:
            await self._budget_col().insert_one(doc)
        except Exception as e:
            logger.warning("Failed to log budget transition: %s", e)

    async def record_consumption(
        self,
        provider: str,
        model: str,
        tokens: int,
        request_id: str = "",
        cost_usd: float = 0.0,
    ) -> None:
        await self.log_usage(provider, model, tokens, request_id, "success", cost_usd)
        await self.vault.update_token_usage(provider, tokens)

    async def get_usage_stats(self, days: int = 30) -> dict:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        today_cutoff = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        pipeline = [
            {"$match": {"timestamp": {"$gte": cutoff}}},
            {
                "$group": {
                    "_id": None,
                    "total_requests": {"$sum": 1},
                    "total_tokens": {"$sum": "$tokens_consumed"},
                    "total_cost": {"$sum": "$cost_usd"},
                    "errors": {"$sum": {"$cond": [{"$eq": ["$status", "error"]}, 1, 0]}},
                }
            },
        ]
        result = await self._usage_col().aggregate(pipeline).to_list(1)

        today_pipeline = [
            {"$match": {"timestamp": {"$gte": today_cutoff}}},
            {
                "$group": {
                    "_id": None,
                    "total_requests": {"$sum": 1},
                    "total_tokens": {"$sum": "$tokens_consumed"},
                    "total_cost": {"$sum": "$cost_usd"},
                }
            },
        ]
        today_result = await self._usage_col().aggregate(today_pipeline).to_list(1)

        by_provider_pipeline = [
            {"$match": {"timestamp": {"$gte": cutoff}}},
            {
                "$group": {
                    "_id": "$provider",
                    "tokens": {"$sum": "$tokens_consumed"},
                    "requests": {"$sum": 1},
                }
            },
            {"$sort": {"tokens": -1}},
        ]
        by_provider = await self._usage_col().aggregate(by_provider_pipeline).to_list(100)

        by_model_pipeline = [
            {"$match": {"timestamp": {"$gte": cutoff}}},
            {
                "$group": {
                    "_id": "$model",
                    "tokens": {"$sum": "$tokens_consumed"},
                    "requests": {"$sum": 1},
                }
            },
            {"$sort": {"tokens": -1}},
            {"$limit": 1},
        ]
        top_model_result = await self._usage_col().aggregate(by_model_pipeline).to_list(1)

        failover_pipeline = [
            {"$match": {"timestamp": {"$gte": today_cutoff}}},
            {"$count": "count"},
        ]
        failover_result = await self._failover_col().aggregate(failover_pipeline).to_list(1)

        monthly = result[0] if result else {}
        today = today_result[0] if today_result else {}
        total_requests = monthly.get("total_requests", 0)
        errors = monthly.get("errors", 0)

        return {
            "total_tokens_used_today": today.get("total_tokens", 0),
            "total_tokens_used_month": monthly.get("total_tokens", 0),
            "total_cost_today": round(today.get("total_cost", 0), 6),
            "total_cost_month": round(monthly.get("total_cost", 0), 6),
            "usage_by_provider": {r["_id"]: r["tokens"] for r in by_provider},
            "most_used_model": top_model_result[0]["_id"] if top_model_result else "none",
            "failover_events_today": failover_result[0]["count"] if failover_result else 0,
            "error_rate": round(errors / max(total_requests, 1), 4),
            "total_requests_month": total_requests,
        }

    async def get_audit_log(self, limit: int = 100) -> dict:
        usage = await self._usage_col().find().sort("timestamp", -1).limit(limit).to_list(limit)
        failover = await self._failover_col().find().sort("timestamp", -1).limit(limit).to_list(limit)
        return {
            "usage_log": [
                {
                    "timestamp": u.get("timestamp", ""),
                    "request_id": u.get("request_id", ""),
                    "provider": u.get("provider", ""),
                    "model": u.get("model", ""),
                    "tokens": u.get("tokens_consumed", 0),
                    "status": u.get("status", ""),
                    "cost_usd": u.get("cost_usd", 0.0),
                }
                for u in usage
            ],
            "failover_log": [
                {
                    "timestamp": f.get("timestamp", ""),
                    "request_id": f.get("request_id", ""),
                    "attempted": f.get("attempted_providers", []),
                    "final": f.get("final_provider", ""),
                    "reason": f.get("reason", ""),
                }
                for f in failover
            ],
        }
