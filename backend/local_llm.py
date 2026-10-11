"""Local AI Response Engine — No API keys needed.

Three-tier architecture:
  Tier 1 — Ollama (local LLM):     If Ollama is running on OLLAMA_HOST,
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

from agents.orchestrator import score_intents
from constants import VISA_CATEGORY_KEYWORDS
from eva_tools import lookup_country, search_universities
from ollama_embeddings import OLLAMA_HOST

logger = logging.getLogger("wehive.local_llm")

_FALLBACK_HIVE_PROMPT = (
    "You are Hive, a friendly visa & travel assistant for We Hive "
    "Immigration Services (Ballari, India). Answer concisely (2-4 "
    "sentences). Use ₹ for INR. Be warm and professional. If asked "
    "about your name, say 'Hive'. Encourage users to start "
    "applications via the dashboard."
)

# ── Local LLM backends ────────────────────────────────────────────────────────
OLLAMA_BASE = OLLAMA_HOST
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
    "study_abroad": ["study in germany", "universities in canada", "student visa australia", "ielts requirement"],
    "holiday": ["best time to visit japan", "thailand travel tips", "holiday in dubai", "things to do in paris"],
    "help": ["what can you do", "how does this work", "help", "commands", "capabilities"],
    "fees": ["visa fee for uk", "how much does us visa cost", "canada visa price", "application fee"],
    "documents": ["documents required", "what do i need", "required documents", "checklist"],
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
    from sentence_transformers import util
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


def _categories(country_data: dict) -> list[dict]:
    """Visa categories as a list. data.py stores them as a dict keyed by type
    (Tourist/Business/...); Mongo docs may already be a list."""
    cats = country_data.get("categories") or []
    if isinstance(cats, dict):
        return [{**c, "type": k} for k, c in cats.items() if isinstance(c, dict)]
    return [c for c in cats if isinstance(c, dict)]


def _cat_matches(cat: dict, visa_type: str) -> bool:
    v = (visa_type or "").lower()
    return bool(v) and (v == str(cat.get("type", "")).lower() or v in str(cat.get("name", "")).lower())


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

    categories = _categories(country_data)
    if visa_type:
        matching = [c for c in categories if _cat_matches(c, visa_type)]
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

    categories = _categories(country_data)
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

    categories = _categories(country_data)
    student_cats = [c for c in categories if _cat_matches(c, "student")]
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


async def _handle_visa_qa(query: str, context: str, params: dict) -> str:
    country_id = params.get("country_id")
    q = query.lower()
    visa_category = _visa_category(query)

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
        categories = _categories(data)
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
        return await _handle_docs(query, context, params)

    # If specific category requested, filter categories
    return _visa_requirements_response(data, visa_category)


def _visa_category(query: str) -> Optional[str]:
    q = query.lower()
    for cat, keywords in VISA_CATEGORY_KEYWORDS.items():
        if any(kw in q for kw in keywords):
            return cat
    return None


async def _handle_docs(query: str, context: str, params: dict) -> str:
    """Document checklist — country-specific when a country is known."""
    visa_type = _visa_category(query)
    if visa_type not in ("tourist", "business", "student", "work"):
        visa_type = "tourist"
    country_id = params.get("country_id")
    data = await lookup_country(country_id) if country_id else None
    if data:
        cat = next((c for c in _categories(data) if _cat_matches(c, visa_type)), None)
        if cat and cat.get("documents"):
            return (
                f"📋 **Documents for a {data.get('name', country_id)} {cat.get('name', visa_type.title())} visa:**"
                f"{_fmt_docs(cat['documents'])}\n\n"
                "Upload them in your We Hive account and we'll check them for you."
            )
    return _docs_response(visa_type)


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
    "greeting": _handle_greeting,
    "help": _handle_help,
    "documents": _handle_docs,
    "fees": _handle_visa_qa,
    "visa_qa": _handle_visa_qa,
    "concierge": _handle_visa_qa,
    "country_info": _handle_visa_qa,
    "study_abroad": _handle_student,
    "holiday": _handle_holiday,
    "fallback": _handle_fallback,
}


def _classify_intent(query: str) -> str:
    """Semantic match (if sentence-transformers is installed), else the shared
    regex scorer in agents.orchestrator. Returns an INTENT_HANDLERS key."""
    semantic = _semantic_classify(query)
    if semantic in INTENT_HANDLERS:
        return semantic
    for hit in score_intents(query):
        if hit["intent"] in INTENT_HANDLERS:
            return hit["intent"]
    return "fallback"


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
        try:
            from prompts_lib import get_store, render_prompt
            store = get_store()
            p = store.get("system.hive")
            if p:
                rendered = render_prompt(p, {"user_input": query})
                sys_prompt = rendered["system"]
            else:
                sys_prompt = _FALLBACK_HIVE_PROMPT
        except Exception as e:
            logger.debug("prompts_lib unavailable, using inline system prompt: %s", e)
            sys_prompt = _FALLBACK_HIVE_PROMPT
        if conversation_history:
            sys_prompt += f"\n\nRecent conversation:\n{conversation_history}"
        ollama_reply = await _ollama_chat(sys_prompt, query, context)
        if ollama_reply:
            logger.info("Used Ollama (%s) for response", OLLAMA_MODEL)
            return ollama_reply
        logger.info("Ollama returned nothing — falling back to templates")

    # Tier 2: Template engine with semantic intent matching
    intent_label = _classify_intent(query)
    if intent_label == "fallback" and params.get("country_id"):
        intent_label = "visa_qa"
    handler = INTENT_HANDLERS[intent_label]
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
