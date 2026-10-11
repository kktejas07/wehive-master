"""Tool Registry — formal tool definitions for the AI agent system.

Each tool has a name, description, parameter schema, and handler.
Used by the ReAct agent loop to decide which tool to call.

Two flavours of retrieval live side-by-side:
  - LIVE tools (visa_lookup) hit external services and must be used for
    volatile data.
  - STABLE tools (rag_search) hit the local RAG vector store for
    namespaced knowledge (university_data, visa_guides, travel_guides,
    document_checklists).
"""

from __future__ import annotations

import logging
from typing import Any, Callable, Dict, List, Optional

logger = logging.getLogger("wehive.tool_registry")


class Tool:
    def __init__(self, name: str, description: str, parameters: dict, handler: Callable):
        self.name = name
        self.description = description
        self.parameters = parameters
        self.handler = handler

    def to_dict(self) -> dict:
        return {
            'name': self.name,
            'description': self.description,
            'parameters': self.parameters,
        }


# Tool instances point to the actual async handlers
# These are populated at import time with the correct references
_tools: Dict[str, Tool] = {}


def register_tool(name: str, description: str, parameters: dict, handler: Callable) -> Tool:
    tool = Tool(name, description, parameters, handler)
    _tools[name] = tool
    return tool


def get_tool(name: str) -> Optional[Tool]:
    return _tools.get(name)


def list_tools() -> List[Tool]:
    return list(_tools.values())


# ─────────────────────────────────────────────────────────────────────────
# Tool implementations live below. Each function is async, returns a JSON-
# serialisable dict, and never raises — it returns an {"error": "..."} dict
# instead so the agent loop can record the failure as an observation.
# ─────────────────────────────────────────────────────────────────────────


async def _visa_lookup_impl(
    passport: str,
    destination: str,
    purpose: str = "tourism",
) -> dict:
    """LIVE — VisaHQ when VISA_HQ_API_KEY is set, else We Hive's own country data.

    Returns requirements + provider + a server-side timestamp so the agent
    can date-stamp the answer.
    """
    from datetime import datetime, timezone
    from adapters.visahq_adapter import get_visa_requirements as visahq_requirements
    from eva_tools import get_visa_requirements as local_requirements

    checked_at = datetime.now(timezone.utc).isoformat()
    try:
        result = await visahq_requirements(passport, destination)
        provider = "visahq"
        if not result:
            result = await local_requirements(destination.lower(), purpose)
            provider = "wehive_data"
    except Exception as e:
        logger.exception("visa_lookup failed: %s", e)
        return {"error": str(e), "checked_at": checked_at}
    if not result:
        return {"error": f"No visa data for destination '{destination}'", "checked_at": checked_at}
    return {
        "checked_at": checked_at,
        "passport": passport,
        "destination": destination,
        "purpose": purpose,
        "requirements": result,
        "provider": provider,
    }


async def _rag_search_impl(
    query: str,
    namespace: str = "university_data",
    top_k: int = 4,
) -> dict:
    """STABLE — retrieve top-k chunks from a RAG collection."""
    try:
        from ollama_embeddings import embed_query
        from vector_store import query_collection
    except Exception as e:
        return {"error": f"vector store unavailable: {e}"}
    try:
        vec = await embed_query(query)
    except Exception as e:
        return {"error": f"embed failed: {e}"}
    if not vec:
        return {"chunks": [], "namespace": namespace}
    try:
        hits = query_collection(namespace, vec, n_results=max(1, min(top_k, 12)))
    except Exception as e:
        logger.warning("RAG query on %s failed: %s", namespace, e)
        return {"error": str(e), "namespace": namespace, "chunks": []}
    return {
        "namespace": namespace,
        "chunks": [
            {
                "id": h.get("id"),
                "document": h.get("document", ""),
                "metadata": h.get("metadata", {}),
                "distance": h.get("distance"),
            }
            for h in hits
        ],
    }


def register_all():
    """Register every agent tool. Called once from server startup; safe to
    call again (register_tool overwrites by name)."""
    from eva_tools import lookup_country, search_countries, lookup_university, search_universities, get_visa_requirements, get_application_fee

    register_tool(
        'lookup_country',
        'Look up visa and country information by country code (e.g. us, uk, ca, au)',
        {
            'type': 'object',
            'properties': {
                'country_id': {'type': 'string', 'description': 'Two-letter country code'}
            },
            'required': ['country_id'],
        },
        lookup_country,
    )

    register_tool(
        'search_countries',
        'Search countries by name or visa type',
        {
            'type': 'object',
            'properties': {
                'query': {'type': 'string', 'description': 'Search query for country name or visa type'}
            },
            'required': ['query'],
        },
        search_countries,
    )

    register_tool(
        'search_universities',
        'Search universities by country and/or course',
        {
            'type': 'object',
            'properties': {
                'country': {'type': 'string', 'description': 'Two-letter country code'},
                'course': {'type': 'string', 'description': 'Course category (e.g. stem, business, medicine)'},
            },
        },
        search_universities,
    )

    register_tool(
        'get_visa_requirements',
        'Get visa requirements including documents, fees, and processing times for a country',
        {
            'type': 'object',
            'properties': {
                'country_id': {'type': 'string', 'description': 'Two-letter country code'},
                'visa_type': {'type': 'string', 'description': 'Optional visa type filter (e.g. tourist, student, business)'},
            },
            'required': ['country_id'],
        },
        get_visa_requirements,
    )

    register_tool(
        'get_application_fee',
        'Get visa application fees for a country in INR',
        {
            'type': 'object',
            'properties': {
                'country_id': {'type': 'string', 'description': 'Two-letter country code'}
            },
            'required': ['country_id'],
        },
        get_application_fee,
    )

    register_tool(
        'lookup_university',
        'Look up a specific university by its ID',
        {
            'type': 'object',
            'properties': {
                'university_id': {'type': 'string', 'description': 'University ID to look up'}
            },
            'required': ['university_id'],
        },
        lookup_university,
    )

    # ── New Hive tools (live + stable) ─────────────────────────────────────
    register_tool(
        'visa_lookup',
        'LIVE — fetch visa requirements for (passport, destination, purpose) from VisaHQ (falls back to We Hive country data). Use this for any visa requirements question; never answer from memory. Returns a server-side timestamp.',
        {
            'type': 'object',
            'properties': {
                'passport': {'type': 'string', 'description': 'Passport country code, e.g. IN, US, GB'},
                'destination': {'type': 'string', 'description': 'Destination country code, e.g. JP, CA, US'},
                'purpose': {'type': 'string', 'description': 'Purpose of travel: tourism | business | study | work | transit'},
            },
            'required': ['passport', 'destination'],
        },
        _visa_lookup_impl,
    )

    register_tool(
        'rag_search',
        'STABLE — semantic search over a RAG collection. Use for universities (university_data / wehive_universities), visa background (visa_guides), travel guides (travel_guides), or document checklists (document_checklists).',
        {
            'type': 'object',
            'properties': {
                'query': {'type': 'string', 'description': 'Natural-language question'},
                'namespace': {'type': 'string', 'description': 'RAG namespace / collection name'},
                'top_k': {'type': 'integer', 'description': 'How many chunks to return (default 4, max 12)'},
            },
            'required': ['query', 'namespace'],
        },
        _rag_search_impl,
    )
