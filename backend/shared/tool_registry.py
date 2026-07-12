"""Tool Registry — formal tool definitions for the AI agent system.

Each tool has a name, description, parameter schema, and handler.
Used by the ReAct agent loop to decide which tool to call.

Two flavours of retrieval live side-by-side:
  - LIVE tools (visa_lookup, document_extract, trip_plan, loan_referral)
    hit external services and must be used for volatile data.
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


def tool_definitions() -> List[dict]:
    return [t.to_dict() for t in _tools.values()]


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
    """LIVE — call the visa adapter (Sherpa / SimpleVisa / VisaHQ).

    Reuses the same `visa_service` abstraction that powers the rest of
    the app. Returns requirements + provider + a server-side timestamp
    so the agent can date-stamp the answer.
    """
    from datetime import datetime
    try:
        from visa_service import get_requirements
    except Exception as e:
        return {"error": f"visa_service unavailable: {e}"}
    try:
        result = await get_requirements(
            passport=passport,
            destination=destination,
            purpose=purpose,
        )
        return {
            "checked_at": datetime.utcnow().isoformat() + "Z",
            "passport": passport,
            "destination": destination,
            "purpose": purpose,
            "requirements": result,
            "provider": result.get("provider", "unknown"),
        }
    except Exception as e:
        logger.exception("visa_lookup failed: %s", e)
        return {"error": str(e), "checked_at": datetime.utcnow().isoformat() + "Z"}


async def _rag_search_impl(
    query: str,
    namespace: str = "university_data",
    top_k: int = 4,
) -> dict:
    """STABLE — retrieve top-k chunks from a RAG collection."""
    try:
        from shared.ollama_embeddings import embed_query
        from shared.vector_store import query_collection
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


async def _document_extract_impl(document_id: str, fields: Optional[list] = None) -> dict:
    """LIVE — extract structured fields from a user-uploaded document.

    Documents are encrypted at rest. The user must have previously
    uploaded the document and granted consent. We never log raw images.
    """
    from datetime import datetime
    try:
        from docai import extract
    except Exception as e:
        return {"error": f"docai unavailable: {e}"}
    try:
        result = await extract(document_id=document_id, fields=fields or [])
        return {
            "document_id": document_id,
            "extracted_at": datetime.utcnow().isoformat() + "Z",
            "fields": result,
        }
    except Exception as e:
        logger.exception("document_extract failed: %s", e)
        return {"error": str(e)}


async def _trip_plan_impl(
    destination: str,
    days: int = 5,
    budget_inr: Optional[int] = None,
    interests: Optional[str] = None,
) -> dict:
    """LIVE — produce a trip plan with live flight + hotel data."""
    from datetime import datetime
    try:
        from travel_service import plan_trip
    except Exception as e:
        return {"error": f"travel_service unavailable: {e}"}
    try:
        result = await plan_trip(
            destination=destination,
            days=max(1, min(int(days or 5), 30)),
            budget_inr=budget_inr,
            interests=interests or "",
        )
        return {
            "destination": destination,
            "days": days,
            "planned_at": datetime.utcnow().isoformat() + "Z",
            "plan": result,
        }
    except Exception as e:
        logger.exception("trip_plan failed: %s", e)
        return {"error": str(e)}


async def _loan_referral_impl(amount_inr: int, purpose: str = "study") -> dict:
    """LIVE — refer a student to a loan partner (Credila / similar)."""
    from datetime import datetime
    try:
        from finance_service import refer_loan
    except Exception as e:
        return {"error": f"finance_service unavailable: {e}"}
    try:
        result = await refer_loan(amount_inr=amount_inr, purpose=purpose)
        return {
            "amount_inr": amount_inr,
            "purpose": purpose,
            "referred_at": datetime.utcnow().isoformat() + "Z",
            "referral": result,
        }
    except Exception as e:
        logger.exception("loan_referral failed: %s", e)
        return {"error": str(e)}


# Tools are registered in register_all() below
def register_all():
    from shared.eva_tools import lookup_country, search_countries, lookup_university, search_universities, get_visa_requirements, get_application_fee

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
        'LIVE — fetch visa requirements for (passport, destination, purpose) from the configured visa provider (Sherpa/SimpleVisa/VisaHQ). Use this for any visa requirements question; never answer from memory. Returns a server-side timestamp.',
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

    register_tool(
        'document_extract',
        'LIVE — extract structured fields from a user-uploaded document by its ID. Documents are encrypted at rest. Requires user consent. Use only for "do I have my documents ready?" or field verification questions.',
        {
            'type': 'object',
            'properties': {
                'document_id': {'type': 'string', 'description': 'Uploaded document ID from the user account'},
                'fields': {'type': 'array', 'items': {'type': 'string'}, 'description': 'Optional list of field names to extract'},
            },
            'required': ['document_id'],
        },
        _document_extract_impl,
    )

    register_tool(
        'trip_plan',
        'LIVE — produce a trip plan (flights + day-by-day itinerary + price estimates) for a destination. Always date-stamp. For prices, always tell the user to confirm before booking.',
        {
            'type': 'object',
            'properties': {
                'destination': {'type': 'string', 'description': 'Destination country or city'},
                'days': {'type': 'integer', 'description': 'Trip length in days (1-30)'},
                'budget_inr': {'type': 'integer', 'description': 'Optional total budget in INR'},
                'interests': {'type': 'string', 'description': 'Comma-separated interests (e.g. food, history, hiking)'},
            },
            'required': ['destination'],
        },
        _trip_plan_impl,
    )

    register_tool(
        'loan_referral',
        'LIVE — refer a student to a loan partner (Credila) for study-abroad or travel financing. Returns a referral code and next steps.',
        {
            'type': 'object',
            'properties': {
                'amount_inr': {'type': 'integer', 'description': 'Loan amount in INR'},
                'purpose': {'type': 'string', 'description': 'Purpose: study | travel | other'},
            },
            'required': ['amount_inr'],
        },
        _loan_referral_impl,
    )
