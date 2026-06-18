"""Local AI Response Engine — No API keys needed.

Three-tier architecture:
  Tier 1 — Ollama (local LLM):     If Ollama is running on http://localhost:11434,
                                    use it for intelligent, context-aware replies.
  Tier 2 — Template engine:         Intent-driven template matching with real data
                                    from eva_tools / data.py.
  Tier 3 — Fallback:                Graceful "I didn't understand" messages.

Optional sentence-transformers for semantic intent matching (pip install sentence-transformers).
"""

import json
import logging
import os
import re
from datetime import datetime
from typing import Optional

import httpx

from agents.orchestrator import detect_intent
from eva_tools import lookup_country, search_countries, search_universities, get_application_fee, get_visa_requirements
from tool_registry import list_tools, get_tool

logger = logging.getLogger("wehive.local_llm")

# ── Local LLM backends ────────────────────────────────────────────────────────
OLLAMA_BASE = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.2")

_ollama_available = None  # lazily checked


async def _check_ollama() -> bool:
    global _ollama_available
    if _ollama_available is not None:
        return _ollama_available
    try:
        async with httpx.AsyncClient(timeout=3.0) as c:
            r = await c.get(f"{OLLAMA_BASE}/api/tags")
            _ollama_available = r.status_code == 200
    except Exception:
        _ollama_available = False
    if _ollama_available:
        logger.info("Ollama detected at %s — using model %s", OLLAMA_BASE, OLLAMA_MODEL)
    else:
        logger.info("Ollama not available — using template engine")
    return _ollama_available


async def _ollama_chat(system: str, prompt: str, context: str = "") -> Optional[str]:
    """Send a chat request to a local Ollama instance."""
    full_prompt = system
    if context:
        full_prompt += f"\n\nRelevant data:\n{context}"
    full_prompt += f"\n\nUser: {prompt}\nAssistant:"
    try:
        async with httpx.AsyncClient(timeout=60.0) as c:
            r = await c.post(
                f"{OLLAMA_BASE}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": full_prompt,
                    "stream": False,
                    "options": {"temperature": 0.3, "num_predict": 512},
                },
            )
            if r.status_code == 200:
                data = r.json()
                return data.get("response", "").strip()
    except Exception as e:
        logger.warning("Ollama request failed: %s", e)
    return None


# ── Optional: sentence-transformers for semantic intent matching ──────────────
_SEMANTIC_AVAILABLE = False
_SEMANTIC_MODEL = None
INTENT_EXAMPLES = {
    "greeting": ["hi", "hello", "hey", "namaste", "good morning", "what's up"],
    "visa_qa": ["visa requirements for canada", "how to get us visa", "uk tourist visa fee", "schengen visa documents"],
    "student": ["study in germany", "universities in canada", "student visa australia", "ielts requirement"],
    "holiday": ["best time to visit japan", "thailand travel tips", "holiday in dubai", "things to do in paris"],
    "help": ["what can you do", "how does this work", "help", "commands", "capabilities"],
    "fees": ["visa fee for uk", "how much does us visa cost", "canada visa price", "application fee"],
    "docs": ["documents required", "what do i need", "required documents", "checklist"],
}


def _init_semantic():
    global _SEMANTIC_AVAILABLE, _SEMANTIC_MODEL
    try:
        from sentence_transformers import SentenceTransformer, util
        _SEMANTIC_MODEL = SentenceTransformer("all-MiniLM-L6-v2")
        _SEMANTIC_AVAILABLE = True
        logger.info("Sentence-transformers loaded — enabling semantic intent matching")
    except ImportError:
        _SEMANTIC_AVAILABLE = False


def _semantic_classify(query: str) -> str:
    """Classify intent using cosine similarity against example queries."""
    if not _SEMANTIC_AVAILABLE or _SEMANTIC_MODEL is None:
        _init_semantic()
    if not _SEMANTIC_AVAILABLE or _SEMANTIC_MODEL is None:
        return ""
    query_emb = _SEMANTIC_MODEL.encode(query.lower(), convert_to_tensor=True)
    best_intent = "fallback"
    best_score = 0.0
    for intent, examples in INTENT_EXAMPLES.items():
        ex_embs = _SEMANTIC_MODEL.encode(examples, convert_to_tensor=True)
        scores = util.cos_sim(query_emb, ex_embs)
        max_score = scores.max().item()
        if max_score > best_score:
            best_score = max_score
            best_intent = intent
    return best_intent if best_score > 0.45 else ""

# ── Response Templates ───────────────────────────────────────────────────────

GREETINGS = [
    "Hi there! 👋 I'm Hive, your visa & travel assistant from We Hive Immigration Services in Ballari.",
    "What would you like to know about visas, travel destinations, or study abroad options today?",
    "You can ask me things like:\n"
    "• *Visa requirements for Canada*\n"
    "• *Tourist visa fees for UK*\n"
    "• *Best time to visit Australia*\n"
    "• *Study options in Germany*",
]

FALLBACKS = [
    "I'm not sure I understood that. Could you rephrase? You can ask about visa requirements, fees, or travel plans for countries like the US, UK, Canada, Australia, and many more.",
    "Hmm, I couldn't find an answer for that. Try asking something like *'Visa requirements for Canada'* or *'Student visa fees for UK'*.",
    "I specialise in visa and travel info for Indian passport holders. Ask me about a specific country, visa type, or travel destination!",
]

COUNTRY_NOT_FOUND = "I couldn't find information for that country right now. Try one of these: US, UK, Canada, Australia, Germany, France, Japan, Singapore, UAE, Thailand, or New Zealand."


def _fmt_money(amount, currency="₹"):
    if not amount or amount == "N/A":
        return "N/A"
    try:
        return f"{currency}{int(amount):,}"
    except (ValueError, TypeError):
        return str(amount)


def _fmt_docs(docs_list) -> str:
    if not docs_list:
        return "—"
    return "\n  • ".join([""] + docs_list)


def _greeting_response() -> str:
    return "\n\n".join(GREETINGS)


def _visa_requirements_response(country_data: dict, visa_type: Optional[str] = None) -> str:
    name = country_data.get("name", "this country")
    lines = [f"Here are the visa requirements for **{name}** 🇮🇳➡️🌍\n"]

    visa_types = country_data.get("visa_types", [])
    if visa_types:
        lines.append(f"**Visa types available:** {', '.join(visa_types)}\n")

    categories = country_data.get("categories", [])
    if visa_type:
        matching = [c for c in categories if c.get("name", "").lower() == visa_type.lower()]
        if matching:
            cat = matching[0]
            lines.append(f"**{cat.get('name')} Visa**")
            inr = _fmt_money(cat.get("fees_inr"))
            usd = _fmt_money(cat.get("fees_usd"), "$")
            lines.append(f"  💰 Fee: {inr} / {usd}")
            lines.append(f"  ⏱ Processing: {cat.get('processing_days', 'N/A')} days")
            lines.append(f"  ✅ Validity: {cat.get('validity', 'N/A')}")
            docs = cat.get("documents", [])
            if docs:
                lines.append(f"  📋 Required documents:{_fmt_docs(docs)}")
        else:
            lines.append(f"No specific data found for '{visa_type}' visa. Here are the general categories:")
            for cat in categories[:5]:
                lines.append(f"  • **{cat.get('name')}** — {_fmt_money(cat.get('fees_inr'))}")
    else:
        for cat in categories[:5]:
            inr = _fmt_money(cat.get("fees_inr"))
            usd = _fmt_money(cat.get("fees_usd"), "$")
            days = cat.get("processing_days", "N/A")
            lines.append(f"  • **{cat.get('name')}** — {inr} / {usd}, {days} days")

    delivery = country_data.get("delivery", {})
    if delivery:
        std = delivery.get("standard_days", "N/A")
        rush = delivery.get("rush_days", "N/A")
        lines.append(f"\n📬 Delivery: {std}d standard, {rush}d rush")

    lines.append(f"\nWant to apply? I can help you start your **{name}** visa application right here!")

    return "\n".join(lines)


def _fees_response(country_data: dict) -> str:
    name = country_data.get("name", "this country")
    lines = [f"💰 **Visa Fees for {name}**\n"]

    categories = country_data.get("categories", [])
    for cat in categories[:5]:
        inr = _fmt_money(cat.get("fees_inr"))
        usd = _fmt_money(cat.get("fees_usd"), "$")
        days = cat.get("processing_days", "N/A")
        lines.append(f"  • **{cat.get('name')}** — {inr} / {usd}, {days} days")

    app_fee = country_data.get("application_fee")
    if app_fee:
        lines.append(f"\n📋 Flat application fee: {_fmt_money(app_fee)} per applicant")

    embassy_fee = country_data.get("embassy_fee")
    if embassy_fee:
        lines.append(f"🏛 Embassy fee: ~{_fmt_money(embassy_fee)}")

    disclaimer = country_data.get("fee_disclaimer")
    if disclaimer:
        lines.append(f"\n_{disclaimer}_")

    return "\n".join(lines)


def _student_response(country_data: dict, unis: list) -> str:
    name = country_data.get("name", "this country")
    lines = [f"🎓 **Study in {name}**\n"]

    sm = country_data.get("student_meta")
    if sm:
        lines.append(f"  ⏱ Processing: {sm.get('processing_weeks', 'N/A')} weeks")
        lines.append(f"  💼 Post-study work: {sm.get('post_study_months', 0)} months")
        intakes = sm.get("intakes", [])
        if intakes:
            lines.append(f"  📅 Intakes: {', '.join(intakes)}")

    categories = country_data.get("categories", [])
    student_cats = [c for c in categories if "student" in c.get("name", "").lower()]
    if student_cats:
        cat = student_cats[0]
        lines.append(f"\n  💰 Student visa fee: {_fmt_money(cat.get('fees_inr'))} / {_fmt_money(cat.get('fees_usd'), '$')}")
        docs = cat.get("documents", [])
        if docs:
            lines.append(f"  📋 Documents needed:{_fmt_docs(docs)}")

    if unis:
        lines.append(f"\n**Top Universities in {name}:**")
        for u in unis[:5]:
            rank = u.get("rank", "N/A")
            tuition = _fmt_money(u.get("tuition_usd", "N/A"), "$")
            ielts = u.get("ielts_min", "N/A")
            lines.append(f"  🏛 {u.get('name', '?')} — Rank #{rank}, Tuition {tuition}/yr, IELTS {ielts}")

    lines.append(f"\nWant to apply for a student visa to **{name}**? I can help you get started!")
    return "\n".join(lines)


def _holiday_response(country_data: dict) -> str:
    from data import get_holiday_plan

    name = country_data.get("name", "this country")
    country_id = country_data.get("id", "")
    plan = get_holiday_plan(country_id, country_data) if country_id else None

    lines = [f"🌍 **Travel Guide: {name}**\n"]

    if plan:
        lines.append(f"**Best time to visit:** {plan.get('best_time', 'Year round')}")
        lines.append(f"**Currency:** {plan.get('currency', '—')}")
        lines.append(f"**Language:** {plan.get('language', '—')}")
        lines.append(f"**Weather:** {plan.get('weather', 'Pleasant most of the year')}")

        attractions = plan.get("attractions", [])
        if attractions:
            lines.append(f"\n**Top attractions:**")
            for a in attractions[:3]:
                lines.append(f"  • {a.get('name', '')} — {a.get('city', '')}")

        itinerary = plan.get("itinerary", [])
        if itinerary:
            lines.append(f"\n**Suggested {len(itinerary)}-day itinerary:**")
            for day in itinerary[:4]:
                lines.append(f"  📍 Day {day.get('day')}: **{day.get('title')}** — {day.get('desc', '')}")
            if len(itinerary) > 4:
                lines.append(f"  … and {len(itinerary) - 4} more days!")
    else:
        lines.append(f"I can help you plan a trip to **{name}**!")
        visa_types = country_data.get("visa_types", [])
        if visa_types:
            lines.append(f"\nAvailable visas: {', '.join(visa_types)}")

    lines.append(f"\nWant me to help plan your **{name}** trip? I can also check visa requirements!")
    return "\n".join(lines)


def _help_response() -> str:
    return (
        "Here's what I can help you with:\n\n"
        "🔍 **Visa requirements** — Ask *'Visa for Canada'* or *'Documents needed for UK tourist visa'*\n"
        "💰 **Fees & costs** — Ask *'Visa fees for Australia'* or *'How much for US visa'*\n"
        "🎓 **Study abroad** — Ask *'Study in Germany'* or *'Universities in Canada'*\n"
        "🌴 **Travel plans** — Ask *'Best time to visit Japan'* or *'Holiday in Thailand'*\n"
        "📋 **Documents** — Ask *'What documents do I need for a business visa'*\n"
        "✈️ **Tracking** — Ask *'Track my application'* or *'Application status'*\n\n"
        "Just type your question and I'll find the answer for you! 😊"
    )


def _docs_response(visa_type: str) -> str:
    from agents.document_validator import REQUIRED_DOCS
    docs = REQUIRED_DOCS.get(visa_type.lower(), REQUIRED_DOCS["tourist"])
    lines = [f"📋 **Required documents for a {visa_type.title()} visa:**\n"]
    for d in docs:
        lines.append(f"  ✅ {d}")
    lines.append(f"\nMake sure all documents are ready before submitting your application. I can help you check them!")
    return "\n".join(lines)


# ── Intent → Template mapping ────────────────────────────────────────────────
# Each handler takes (query, context_data, params) and returns a response string

async def _handle_greeting(query: str, context: str, params: dict) -> str:
    return _greeting_response()


# ── Visa category keywords (sorted by specificity) ──────────────────────────
VISA_TYPE_KEYWORDS = {
    "sticker": ["sticker", "traditional", "embassy", "consulate", "in-person", "appointment", "biometric"],
    "e-visa": ["e-visa", "evisa", "electronic visa", "online visa", "digital visa", "eta"],
    "on-arrival": ["on-arrival", "on arrival", "landing", "arrival visa", "visa on arrival", "voa"],
    "visa-free": ["visa-free", "visa free", "no visa", "without visa", "free entry", "visa exempt", "visa exemption"],
    "transit": ["transit", "layover", "connecting flight", "stopover", "airport transit"],
    "medical": ["medical", "health", "treatment", "medical visa"],
    "business": ["business", "corporate", "work trip", "business trip", "conference"],
    "student": ["study", "student", "university", "college", "academic"],
    "work": ["work", "employment", "job", "professional", "employee"],
    "tourist": ["tourist", "tourism", "travel", "vacation", "sightseeing"],
}


async def _handle_visa_qa(query: str, context: str, params: dict) -> str:
    country_id = params.get("country_id")
    q = query.lower()

    # Detect visa category (more specific first)
    visa_category = None
    for cat, keywords in VISA_TYPE_KEYWORDS.items():
        if any(kw in q for kw in keywords):
            visa_category = cat
            break

    if not country_id:
        return "Which country are you interested in? Try asking about the US, UK, Canada, Australia, or any other country!"

    data = await lookup_country(country_id)
    if not data:
        return COUNTRY_NOT_FOUND

    is_fee = any(kw in q for kw in ["fee", "cost", "price", "how much", "₹", "$", "payment"])
    is_docs = any(kw in q for kw in ["document", "need", "required", "upload", "submit"])
    is_list = any(kw in q for kw in ["list", "all visa", "types", "categories", "available", "options", "show"])

    # List all visa types available for a country
    if is_list or q.startswith("list"):
        visa_types = data.get("visa_types", [])
        categories = data.get("categories", [])
        lines = [f"📋 **Visa options for {data.get('name', country_id)}:**\n"]
        highlights = data.get("highlights", [])
        if highlights:
            lines.append(f"✨ {', '.join(highlights)}\n")
        for cat in categories:
            lines.append(f"  • **{cat.get('name')}** — {_fmt_money(cat.get('fees_inr'))} / {_fmt_money(cat.get('fees_usd'), '$')}, {cat.get('processing_days', 'N/A')} days")
        if visa_types:
            lines.append(f"\nAvailable categories: {', '.join(visa_types)}")
        return "\n".join(lines)

    if is_fee:
        return _fees_response(data)
    if is_docs and visa_category:
        return _docs_response(visa_category)

    # If specific category requested, filter categories
    matching = []
    categories = data.get("categories", [])
    if visa_category:
        # Check if any category name matches
        for cat in categories:
            cname = cat.get("name", "").lower()
            for kw in VISA_TYPE_KEYWORDS.get(visa_category, []):
                if kw in cname or visa_category in cname:
                    matching.append(cat)
                    break
        if not matching:
            # Try broader match by checking visa_type names
            visa_types = [vt.lower() for vt in data.get("visa_types", [])]
            if visa_category in visa_types or any(visa_category in vt for vt in visa_types):
                matching = categories

    if matching:
        return _visa_requirements_response(data, visa_category)

    return _visa_requirements_response(data, visa_category)


async def _handle_student(query: str, context: str, params: dict) -> str:
    country_id = params.get("country_id")

    if not country_id:
        return "Which country are you looking to study in? I have info on universities in the US, UK, Canada, Australia, Germany, and more!"

    data = await lookup_country(country_id)
    if not data:
        return COUNTRY_NOT_FOUND

    unis = await search_universities(country=country_id)
    return _student_response(data, unis)


async def _handle_holiday(query: str, context: str, params: dict) -> str:
    country_id = params.get("country_id")

    if not country_id:
        return "Which country are you planning to visit? I can suggest holiday plans for destinations worldwide!"

    data = await lookup_country(country_id)
    if not data:
        return COUNTRY_NOT_FOUND

    return _holiday_response(data)


async def _handle_help(query: str, context: str, params: dict) -> str:
    return _help_response()


async def _handle_fallback(query: str, context: str, params: dict) -> str:
    import random
    return random.choice(FALLBACKS)


# ── Intent Registry ──────────────────────────────────────────────────────────

INTENT_HANDLERS = {
    "Hive (visa Q&A)": _handle_visa_qa,
    "visa_qa": _handle_visa_qa,
    "workflow": _handle_student,
    "concierge": _handle_visa_qa,
    "holiday": _handle_holiday,
    "help": _handle_help,
    "greeting": _handle_greeting,
    "fallback": _handle_fallback,
}


def _classify_intent(query: str) -> str:
    """Classify intent using: semantic (if available) → regex heuristics → orchestrator."""
    q = query.lower().strip()

    # Tier A — Semantic classification (if sentence-transformers is installed)
    semantic = _semantic_classify(query)
    if semantic:
        return semantic

    # Tier B — Regex heuristics
    greeting_patterns = re.compile(
        r"^(hi|hello|hey|hii|h ello| heyy|namaste|good (morning|afternoon|evening)|"
        r"what'?s up|howdy|sup|yo|^how are you|who are you|what can you do|help)$", re.I
    )
    if greeting_patterns.match(q) or greeting_patterns.search(q):
        return "greeting"
    if re.search(r"\b(help|what can you do|how (do|can) you (work|help)|guide|commands|capabilities)\b", q):
        return "help"
    if re.search(r"\b(holiday|vacation|trip|travel|visit|tour|destination|best time|weather|attraction|itinerary|plan)", q):
        result = detect_intent(query)
        if "visa" in result.agent.lower() or "qa" in result.agent.lower():
            return "holiday"
        return result.agent

    # Tier C — Orchestrator regex scoring
    return detect_intent(query).agent


# ── Main Engine ──────────────────────────────────────────────────────────────

async def local_chat(query: str, context: str = "", conversation_history: str = "") -> str:
    """Three-tier response generation:
    1. Ollama (local LLM, if running)
    2. Template engine (intent-driven)
    3. Fallback
    """
    params = {}
    from agents.orchestrator import RE_COUNTRY
    codes = RE_COUNTRY.findall(query)
    if codes:
        params["country_id"] = codes[0].lower()
    elif context:
        for line in context.split("\n"):
            m = re.match(r"Country:\s*(\w+)", line)
            if m:
                params["country_id"] = m.group(1).strip().lower()
                break

    # Tier 1: Try Ollama (local LLM)
    if await _check_ollama():
        sys_prompt = (
            "You are Hive, a friendly visa & travel assistant for We Hive Immigration Services (Ballari, India). "
            "Answer concisely (2-4 sentences). Use ₹ for INR. Be warm and professional. "
            "If asked about your name, say 'Hive'. Encourage users to start applications via the dashboard."
        )
        if conversation_history:
            sys_prompt += f"\n\nRecent conversation:\n{conversation_history}"
        ollama_reply = await _ollama_chat(sys_prompt, query, context)
        if ollama_reply:
            logger.info("Used Ollama (%s) for response", OLLAMA_MODEL)
            return ollama_reply
        logger.info("Ollama returned nothing — falling back to templates")

    # Tier 2: Template engine with semantic intent matching
    intent_label = _classify_intent(query)
    handler = INTENT_HANDLERS.get(intent_label, _handle_fallback)
    try:
        response = await handler(query, context, params)
    except Exception as e:
        logger.exception("local_chat error for intent=%s: %s", intent_label, e)
        response = _help_response()

    return response


async def local_chat_with_info(query: str, context: str = "", conversation_history: str = "") -> tuple:
    """Returns (response, provider_info) for API compatibility."""
    response = await local_chat(query, context, conversation_history)
    used_model = OLLAMA_MODEL if _ollama_available else "template-v1"
    provider_info = {
        "id": "local",
        "name": "Hive (Local Engine)",
        "model": used_model,
        "powered_by_tagline": "Powered by We Hive's Local AI Engine",
    }
    return response, provider_info
