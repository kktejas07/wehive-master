"""AI Agent Runner — runs all proactive agents and returns aggregated results.
Each agent independently checks conditions and returns actionable items.
"""

import logging
from typing import List

from core.db import db
from agents.application_progress import run_all_checks as check_progress
from agents.deadline_agent import run_all_checks as check_deadlines
from agents.document_readiness import run_all_checks as check_documents
from agents.proactive_support import run_all_checks as check_support

logger = logging.getLogger("wehive.agent_runner")

AGENT_REGISTRY = {
    "application_progress": {
        "name": "Application Progress Agent",
        "description": "Tracks application stage transitions and flags stalls",
        "runner": check_progress,
    },
    "deadline_reminder": {
        "name": "Deadline & Reminder Agent",
        "description": "Calculates deadlines and sends timed alerts",
        "runner": check_deadlines,
    },
    "document_readiness": {
        "name": "Document Readiness Agent",
        "description": "Validates uploaded documents for completeness",
        "runner": check_documents,
    },
    "proactive_support": {
        "name": "Proactive Support Agent",
        "description": "Monitors user behavior and triggers contextual help",
        "runner": check_support,
    },
}


async def run_agent(agent_id: str) -> List[dict]:
    """Run a single agent by ID and return its alerts."""
    agent = AGENT_REGISTRY.get(agent_id)
    if not agent:
        return []
    try:
        logger.info("Running agent: %s", agent_id)
        return await agent["runner"](db)
    except Exception as e:
        logger.exception("Agent %s failed: %s", agent_id, e)
        return []


async def run_all_agents() -> dict:
    """Run every registered agent and collect results."""
    results = {}
    for agent_id, meta in AGENT_REGISTRY.items():
        alerts = await run_agent(agent_id)
        results[agent_id] = {
            "name": meta["name"],
            "alerts_count": len(alerts),
            "alerts": alerts[:20],  # cap per agent
        }
    return results
