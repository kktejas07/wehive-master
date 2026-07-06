"""MCP Runtime — JSON-RPC 2.0 compliant Model Context Protocol server.

Implements the MCP spec: tools/list, tools/call, resources/list, resources/read,
prompts/list, prompts/get, initialize, and notifications.

This is a working MCP server that can be connected to by MCP clients (Claude Desktop,
Cursor, etc.) via HTTP transport.

Tools exposed are the Hyra-native tools that wrap We Hive functionality.
"""

import json
import logging
from typing import Any, Optional

logger = logging.getLogger("wehive.mcp")

TOOLS = {
    "wehive_visa_lookup": {
        "name": "wehive_visa_lookup",
        "description": "Look up visa requirements for a country. Returns visa types, fees, documents needed, and processing times for Indian passport holders.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "country": {"type": "string", "description": "Country code (e.g., 'us', 'uk', 'ca', 'au') or name"},
                "visa_type": {"type": "string", "description": "Visa type: tourist, business, student, work, transit"},
            },
            "required": ["country"],
        },
    },
    "wehive_country_info": {
        "name": "wehive_country_info",
        "description": "Get detailed information about a country including capital, currency, languages, visa policy for Indians, and travel highlights.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "country": {"type": "string", "description": "Country code or name"},
            },
            "required": ["country"],
        },
    },
    "wehive_slot_check": {
        "name": "wehive_slot_check",
        "description": "Check US visa appointment slot availability at Indian consulates. Returns available dates and times per consulate and visa type.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "visa_type": {"type": "string", "description": "Visa type: b1b2, f1, h1b, h4, l1, j1"},
                "consulate": {"type": "string", "description": "Consulate: mumbai, delhi, chennai, kolkata, hyderabad"},
            },
        },
    },
    "wehive_fee_calculator": {
        "name": "wehive_fee_calculator",
        "description": "Calculate visa application fees in INR for Indian passport holders. Includes base fee, service charge, and GST breakdown.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "country": {"type": "string", "description": "Destination country code"},
                "visa_type": {"type": "string", "description": "Visa type"},
                "applicants": {"type": "integer", "description": "Number of applicants"},
            },
            "required": ["country", "visa_type"],
        },
    },
    "wehive_document_checklist": {
        "name": "wehive_document_checklist",
        "description": "Get the required document checklist for a specific visa type. Returns list of mandatory and optional documents.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "country": {"type": "string", "description": "Country code"},
                "visa_type": {"type": "string", "description": "Visa type"},
            },
            "required": ["country", "visa_type"],
        },
    },
    "wehive_university_search": {
        "name": "wehive_university_search",
        "description": "Search for universities by name, country, course, or ranking. Returns matched universities with details.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query"},
                "country": {"type": "string", "description": "Filter by country"},
                "min_rank": {"type": "integer", "description": "Minimum QS ranking"},
            },
            "required": ["query"],
        },
    },
    "wehive_risk_assessment": {
        "name": "wehive_risk_assessment",
        "description": "Run an AI-powered visa rejection risk assessment. Analyzes profile completeness, application history, document readiness, and more.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "application_id": {"type": "string", "description": "Application ID to assess"},
            },
            "required": ["application_id"],
        },
    },
    "wehive_knowledge_search": {
        "name": "wehive_knowledge_search",
        "description": "Search the We Hive knowledge base using semantic search. Returns relevant visa guides, travel tips, and document checklists.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Natural language query"},
                "top_k": {"type": "integer", "description": "Number of results to return (default 5)"},
            },
            "required": ["query"],
        },
    },
    "wehive_flight_suggest": {
        "name": "wehive_flight_suggest",
        "description": "Get AI-powered flight suggestions from Indian cities to your destination. Returns 3 options with pricing in INR.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "country": {"type": "string", "description": "Destination country code"},
                "origin": {"type": "string", "description": "Origin airport code (e.g., BLR, DEL, BOM)"},
            },
            "required": ["country"],
        },
    },
    "wehive_translate": {
        "name": "wehive_translate",
        "description": "Translate text between languages. Supports 100+ languages via AI translation.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "text": {"type": "string", "description": "Text to translate"},
                "source_lang": {"type": "string", "description": "Source language code (auto for auto-detect)"},
                "target_lang": {"type": "string", "description": "Target language code"},
            },
            "required": ["text", "target_lang"],
        },
    },
    "brave_web_search": {
        "name": "brave_web_search",
        "description": "Search the web using Brave Search API — privacy-focused, free tier (2K/mo), MIT licensed. Returns web results with titles, URLs, and descriptions.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query"},
                "count": {"type": "integer", "description": "Number of results (1-20, default 5)"},
            },
            "required": ["query"],
        },
    },
    "brave_news_search": {
        "name": "brave_news_search",
        "description": "Search recent news articles using Brave News API. Returns articles from the past month. Free tier included.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "News search query"},
                "count": {"type": "integer", "description": "Number of articles (1-20, default 5)"},
            },
            "required": ["query"],
        },
    },
    "amadeus_flight_search": {
        "name": "amadeus_flight_search",
        "description": "Search real-time flight offers using Amadeus. Returns pricing, airline, duration, stops in INR or specified currency.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "origin": {"type": "string", "description": "Origin airport IATA code (e.g. DEL, BOM, BLR)"},
                "destination": {"type": "string", "description": "Destination airport IATA code (e.g. JFK, LHR, DXB)"},
                "date": {"type": "string", "description": "Departure date (YYYY-MM-DD)"},
                "currency": {"type": "string", "description": "Currency code (default INR)"},
            },
            "required": ["origin", "destination", "date"],
        },
    },
    "amadeus_flight_inspiration": {
        "name": "amadeus_flight_inspiration",
        "description": "Find destinations by budget. 'Where can I go with ₹50K?' Returns destinations within max price.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "origin": {"type": "string", "description": "Origin airport IATA code"},
                "max_price": {"type": "integer", "description": "Maximum budget in currency units"},
            },
            "required": ["origin"],
        },
    },
}

RESOURCES = [
    {
        "uri": "wehive://countries/list",
        "name": "Countries List",
        "description": "List of all 250+ countries with visa information for Indian passport holders",
        "mimeType": "application/json",
    },
    {
        "uri": "wehive://consulates/india",
        "name": "US Consulates in India",
        "description": "List of US consulates in India with addresses and jurisdictions",
        "mimeType": "application/json",
    },
    {
        "uri": "wehive://visa-types/list",
        "name": "Visa Types",
        "description": "List of all supported visa types and categories",
        "mimeType": "application/json",
    },
]

PROMPTS = [
    {
        "name": "visa_assistant",
        "description": "System prompt for the We Hive Visa Assistant. Answers visa questions with accurate, up-to-date information.",
        "arguments": [{"name": "visa_type", "description": "Visa type to focus on", "required": False}],
    },
    {
        "name": "travel_planner",
        "description": "System prompt for the We Hive Travel Planner. Creates personalized itineraries.",
        "arguments": [{"name": "country", "description": "Destination country", "required": True}],
    },
    {
        "name": "document_assistant",
        "description": "System prompt for the We Hive Document Assistant. Helps with visa document preparation.",
        "arguments": [],
    },
]


def _make_response(id: Any, result: Any = None, error: dict = None) -> dict:
    return {
        "jsonrpc": "2.0",
        "id": id,
        "result": result,
        "error": error,
    }


async def _execute_tool(tool_name: str, arguments: dict) -> dict:
    from db import db as mongo_db

    if tool_name == "wehive_visa_lookup":
        country = arguments.get("country", "").lower()
        try:
            from eva_tools import lookup_country
            result = await lookup_country(country)
            return {"content": [{"type": "text", "text": json.dumps(result or {}, default=str)}]}
        except Exception as e:
            return {"content": [{"type": "text", "text": json.dumps({"error": str(e)})}]}

    elif tool_name == "wehive_country_info":
        country = arguments.get("country", "").lower()
        doc = await mongo_db["countries_v2"].find_one({"id": country})
        if not doc:
            doc = await mongo_db["countries_v2"].find_one({"name": {"$regex": country, "$options": "i"}})
        return {"content": [{"type": "text", "text": json.dumps(doc or {}, default=str)}]}

    elif tool_name == "wehive_slot_check":
        vt = arguments.get("visa_type", "b1b2")
        consulate = arguments.get("consulate")
        q = {"visa_type": vt}
        if consulate:
            q["consulate"] = consulate
        slots = await mongo_db["usvisa_slots"].find(q).sort("date", 1).to_list(20)
        return {"content": [{"type": "text", "text": json.dumps(slots, default=str)[:4000]}]}

    elif tool_name == "wehive_fee_calculator":
        country = arguments.get("country", "")
        visa_type = arguments.get("visa_type", "tourist")
        applicants = arguments.get("applicants", 1)
        try:
            from eva_tools import get_application_fee
            fee = await get_application_fee(country, visa_type)
            result = {"country": country, "visa_type": visa_type, "applicants": applicants,
                      "fee_per_applicant": fee, "total": fee * applicants,
                      "currency": "INR (approximate)"}
            return {"content": [{"type": "text", "text": json.dumps(result)}]}
        except Exception as e:
            return {"content": [{"type": "text", "text": json.dumps({"error": str(e)})}]}

    elif tool_name == "wehive_document_checklist":
        country = arguments.get("country", "")
        visa_type = arguments.get("visa_type", "tourist")
        try:
            from agents.document_validator import REQUIRED_DOCS
            docs = REQUIRED_DOCS.get(visa_type, REQUIRED_DOCS.get("tourist", []))
            return {"content": [{"type": "text", "text": json.dumps({"country": country, "visa_type": visa_type, "documents": docs})}]}
        except Exception as e:
            return {"content": [{"type": "text", "text": json.dumps({"error": str(e)})}]}

    elif tool_name == "wehive_university_search":
        query = arguments.get("query", "")
        country = arguments.get("country")
        q = {"$text": {"$search": query}}
        if country:
            q["country"] = country
        unis = await mongo_db["universities_v2"].find(q).to_list(10)
        result = [{"name": u.get("name"), "country": u.get("country"), "rank": u.get("qs_rank")} for u in unis]
        return {"content": [{"type": "text", "text": json.dumps(result)}]}

    elif tool_name == "wehive_risk_assessment":
        app_id = arguments.get("application_id", "")
        try:
            from routes_people_intelligence import _compute_risk_score
            app = await mongo_db["applications"].find_one({"_id": app_id})
            if app and app.get("user_id"):
                risk = await _compute_risk_score(app["user_id"])
                return {"content": [{"type": "text", "text": json.dumps(risk, default=str)}]}
            return {"content": [{"type": "text", "text": json.dumps({"error": "Application not found"})}]}
        except Exception as e:
            return {"content": [{"type": "text", "text": json.dumps({"error": str(e)})}]}

    elif tool_name == "wehive_knowledge_search":
        query = arguments.get("query", "")
        top_k = arguments.get("top_k", 5)
        try:
            from rag_service import retrieve_context
            context = await retrieve_context(query, top_k=top_k)
            return {"content": [{"type": "text", "text": context[:3000]}]}
        except Exception as e:
            return {"content": [{"type": "text", "text": json.dumps({"error": str(e)})}]}

    elif tool_name == "wehive_flight_suggest":
        country = arguments.get("country", "")
        origin = arguments.get("origin", "DEL")
        try:
            from ai_marketplace import marketplace
            response = await marketplace.chat(
                messages=[
                    {"role": "system", "content": "Generate 3 realistic flight suggestions. Return JSON array."},
                    {"role": "user", "content": f"Flights from {origin} to {country}. Return 3 options with airline, price (INR), duration, stops."},
                ],
                max_tokens=500,
            )
            content = response.get("content", "[]") if isinstance(response, dict) else "[]"
            return {"content": [{"type": "text", "text": content}]}
        except Exception as e:
            return {"content": [{"type": "text", "text": json.dumps({"error": str(e)})}]}

    elif tool_name == "wehive_translate":
        text = arguments.get("text", "")
        source = arguments.get("source_lang", "auto")
        target = arguments.get("target_lang", "en")
        try:
            from ai_marketplace import marketplace
            response = await marketplace.chat(
                messages=[
                    {"role": "system", "content": f"Translate from {source} to {target}. Return only the translated text."},
                    {"role": "user", "content": text},
                ],
                temperature=0.3,
            )
            translated = response.get("content", "") if isinstance(response, dict) else ""
            return {"content": [{"type": "text", "text": json.dumps({"original": text[:200], "translated": translated})}]}
        except Exception as e:
            return {"content": [{"type": "text", "text": json.dumps({"error": str(e)})}]}

    elif tool_name == "brave_web_search":
        query = arguments.get("query", "")
        try:
            from agents.stark_agent import fetch_brave_search
            result = await fetch_brave_search(query, arguments.get("count", 5))
            return {"content": [{"type": "text", "text": json.dumps(result or {}, default=str)}]}
        except Exception as e:
            return {"content": [{"type": "text", "text": json.dumps({"error": str(e)})}]}

    elif tool_name == "brave_news_search":
        query = arguments.get("query", "")
        try:
            from agents.stark_agent import fetch_brave_news
            result = await fetch_brave_news(query, arguments.get("count", 5))
            return {"content": [{"type": "text", "text": json.dumps(result or {}, default=str)}]}
        except Exception as e:
            return {"content": [{"type": "text", "text": json.dumps({"error": str(e)})}]}

    elif tool_name == "amadeus_flight_search":
        try:
            from adapters.amadeus_adapter import search_flights
            result = await search_flights(
                arguments["origin"], arguments["destination"],
                arguments["date"], currency=arguments.get("currency", "INR"),
            )
            return {"content": [{"type": "text", "text": json.dumps(result or {"flights": []}, default=str)}]}
        except Exception as e:
            return {"content": [{"type": "text", "text": json.dumps({"error": str(e)})}]}

    elif tool_name == "amadeus_flight_inspiration":
        try:
            from adapters.amadeus_adapter import flight_inspiration_search
            result = await flight_inspiration_search(
                arguments["origin"],
                arguments.get("max_price", 50000),
            )
            return {"content": [{"type": "text", "text": json.dumps(result or {}, default=str)}]}
        except Exception as e:
            return {"content": [{"type": "text", "text": json.dumps({"error": str(e)})}]}

    return {"content": [{"type": "text", "text": json.dumps({"error": f"Unknown tool: {tool_name}"})}]}


async def _read_resource(uri: str) -> dict:
    from db import db as mongo_db

    if uri == "wehive://countries/list":
        countries = await mongo_db["countries_v2"].find({}, {"name": 1, "capital": 1, "region": 1, "id": 1}).to_list(300)
        return {"contents": [{"uri": uri, "mimeType": "application/json", "text": json.dumps(countries, default=str)[:10000]}]}

    elif uri == "wehive://consulates/india":
        consulates = [
            {"name": "Mumbai VAC", "city": "Mumbai", "jurisdiction": "MH, GJ, RJ, MP, Goa"},
            {"name": "New Delhi Embassy", "city": "New Delhi", "jurisdiction": "DL, PB, HR, UK, HP, JK"},
            {"name": "Chennai Consulate", "city": "Chennai", "jurisdiction": "TN, KL, KA, AP, Telangana"},
            {"name": "Kolkata Consulate", "city": "Kolkata", "jurisdiction": "WB, BR, JH, OD, NE states"},
            {"name": "Hyderabad Consulate", "city": "Hyderabad", "jurisdiction": "Telangana, AP"},
        ]
        return {"contents": [{"uri": uri, "mimeType": "application/json", "text": json.dumps(consulates)}]}

    elif uri == "wehive://visa-types/list":
        types = [
            {"id": "tourist", "name": "Tourist (B1/B2)", "max_stay": "6 months", "processing": "3-5 days"},
            {"id": "business", "name": "Business (B1)", "max_stay": "6 months", "processing": "3-5 days"},
            {"id": "student", "name": "Student (F1/J1)", "max_stay": "Duration of study", "processing": "2-4 weeks"},
            {"id": "work", "name": "Work (H1B/L1)", "max_stay": "3 years (renewable)", "processing": "3-6 months"},
            {"id": "transit", "name": "Transit (C)", "max_stay": "29 days", "processing": "2-3 days"},
            {"id": "medical", "name": "Medical (B2)", "max_stay": "6 months", "processing": "3-5 days"},
        ]
        return {"contents": [{"uri": uri, "mimeType": "application/json", "text": json.dumps(types)}]}

    return {"contents": [{"uri": uri, "mimeType": "text/plain", "text": json.dumps({"error": "Resource not found"})}]}


async def _get_prompt(name: str, arguments: dict = None) -> dict:
    if name == "visa_assistant":
        text = "You are Hive, the visa assistant for We Hive Immigration Services. Provide accurate, up-to-date visa information for Indian passport holders. Always cite official embassy sources when possible."
        if arguments and arguments.get("visa_type"):
            text += f"\nFocus on {arguments['visa_type']} visa type."
        return {"messages": [{"role": "system", "content": text}]}

    elif name == "travel_planner":
        country = (arguments or {}).get("country", "your destination")
        text = f"You are Hive, the travel planner for We Hive. Create a personalized itinerary for traveling to {country}. Include flights from India, accommodation tips, must-visit places, local food, and budget estimates in INR."
        return {"messages": [{"role": "system", "content": text}]}

    elif name == "document_assistant":
        text = "You are Hive, the document assistant for We Hive. Help users prepare their visa application documents. List required documents, explain formats, sizes, and common mistakes to avoid."
        return {"messages": [{"role": "system", "content": text}]}

    return {"messages": [{"role": "system", "content": "We Hive AI Assistant."}]}


async def handle_mcp_request(method: str, params: dict = None, req_id: Any = None) -> dict:
    """Handle a single MCP JSON-RPC 2.0 request."""

    try:
        if method == "initialize":
            return _make_response(req_id, {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {},
                    "resources": {},
                    "prompts": {},
                },
                "serverInfo": {
                    "name": "We Hive MCP Server",
                    "version": "1.0.0",
                },
            })

        elif method == "notifications/initialized":
            return None

        elif method == "tools/list":
            tools_list = list(TOOLS.values())
            return _make_response(req_id, {"tools": tools_list})

        elif method == "tools/call":
            if not params:
                return _make_response(req_id, error={"code": -32602, "message": "Missing params"})
            tool_name = params.get("name", "")
            arguments = params.get("arguments", {})
            if tool_name not in TOOLS:
                return _make_response(req_id, error={"code": -32601, "message": f"Tool not found: {tool_name}"})
            result = await _execute_tool(tool_name, arguments)
            return _make_response(req_id, result)

        elif method == "resources/list":
            return _make_response(req_id, {"resources": RESOURCES})

        elif method == "resources/read":
            if not params:
                return _make_response(req_id, error={"code": -32602, "message": "Missing params"})
            uri = params.get("uri", "")
            result = await _read_resource(uri)
            return _make_response(req_id, result)

        elif method == "prompts/list":
            return _make_response(req_id, {"prompts": PROMPTS})

        elif method == "prompts/get":
            if not params:
                return _make_response(req_id, error={"code": -32602, "message": "Missing params"})
            name = params.get("name", "")
            args = params.get("arguments", {})
            result = await _get_prompt(name, args)
            return _make_response(req_id, result)

        elif method == "ping":
            return _make_response(req_id, {"pong": True})

        else:
            return _make_response(req_id, error={"code": -32601, "message": f"Method not found: {method}"})

    except Exception as e:
        logger.exception("MCP handler error: %s", e)
        return _make_response(req_id, error={"code": -32603, "message": str(e)})


def list_tools() -> list[dict]:
    return [{"name": t["name"], "description": t["description"]} for t in TOOLS.values()]


def get_tool_schema(tool_name: str) -> Optional[dict]:
    return TOOLS.get(tool_name)
