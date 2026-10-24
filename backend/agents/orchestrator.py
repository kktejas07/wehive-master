"""Intent scoring — ``score_intents`` is the single regex intent classifier
shared by the local template engine (local_llm) and Hive/Stark
(routes_agentic_ai).
"""

import re
from typing import Optional

RE_COUNTRY = re.compile(r"\b(us|uk|ca|au|de|fr|it|es|jp|sg|ae|th|ch|np|bt|pl|at|pt|gr|hr)\b", re.I)

# Full country names → 2-letter ids (RE_COUNTRY alone can't match "Japan").
# India is deliberately absent: We Hive serves Indian passport holders going
# abroad, and \bin\b would false-positive on the English word "in".
COUNTRY_ALIASES = {
    "united states": "us", "usa": "us", "america": "us",
    "united kingdom": "uk", "britain": "uk", "great britain": "uk", "england": "uk",
    "canada": "ca", "australia": "au", "germany": "de", "france": "fr",
    "italy": "it", "spain": "es", "japan": "jp", "singapore": "sg",
    "uae": "ae", "united arab emirates": "ae", "dubai": "ae",
    "thailand": "th", "switzerland": "ch", "nepal": "np", "bhutan": "bt",
    "poland": "pl", "austria": "at", "portugal": "pt", "greece": "gr",
    "croatia": "hr", "new zealand": "nz", "bahrain": "bh", "egypt": "eg",
    "fiji": "fj", "indonesia": "id", "bali": "id", "kenya": "ke",
    "cambodia": "kh", "kuwait": "kw", "laos": "la", "sri lanka": "lk",
    "myanmar": "mm", "mauritius": "mu", "maldives": "mv", "malaysia": "my",
    "oman": "om", "russia": "ru", "saudi arabia": "sa", "seychelles": "sc",
    "turkey": "tr", "tanzania": "tz", "uganda": "ug", "vietnam": "vn",
    "zimbabwe": "zw",
}
RE_COUNTRY_NAME = re.compile(
    r"\b(" + "|".join(re.escape(k) for k in sorted(COUNTRY_ALIASES, key=len, reverse=True)) + r")\b",
    re.I,
)


def extract_country_id(text: str) -> Optional[str]:
    """Full country names first (unambiguous), then bare 2-letter codes."""
    if not text:
        return None
    m = RE_COUNTRY_NAME.search(text)
    if m:
        return COUNTRY_ALIASES[m.group(1).lower()]
    codes = RE_COUNTRY.findall(text)
    return codes[0].lower() if codes else None


# Canonical intents. Each pattern match adds 2 points (capped at 10); intents
# in _INTENT_BONUS get extra weight because they are more specific than the
# generic "visa" vocabulary that co-occurs with them.
INTENT_PATTERNS: dict[str, list[str]] = {
    "greeting": [
        r"^\s*(hi+|hello|hey+|namaste|good (morning|afternoon|evening)|what'?s up|howdy|yo|"
        r"how are you|who are you)\b[\s!.?]*$",
    ],
    "help": [r"\b(help|what can you do|how (do|can) you (work|help)|commands|capabilities)\b"],
    "documents": [
        r"\b(documents?|checklist|paperwork|what do i need|bank statements?|cover letter|photographs?)\b",
    ],
    "fees": [r"(\bfees?\b|\bcosts?\b|\bprice\b|how much|₹)"],
    "visa_qa": [
        r"\b(visa|visa type|visa requirement|embassy|consulate)\b",
        r"\b(ds.?160|i.?20|i.?129|i.?797|h.?1b|b.?[12]|f.?1|l.?1)\b",
        r"\b(appointment|slot|interview|biometrics|stamping)\b",
    ],
    "concierge": [r"\b(apply|start (an? )?application|new application|begin my application)\b"],
    "study_abroad": [
        r"\b(study|university|universities|college|course|program|degree|master'?s?|bachelor'?s?|phd)\b",
        r"\b(scholarships?|ielts|toefl|gre|gmat|sat|gpa|acceptance|intake|tuition)\b",
    ],
    "holiday": [
        r"\b(holiday|vacation|trip|itinerary|best time|weather|attractions?|things to do|tour|sightseeing)\b",
    ],
    "country_info": [
        r"\b(travel to|visit|go to|tourism in)\s+([a-z]+(?:\s+[a-z]+)*)",
        r"\b(tell me about|info on)\s+([a-z]+(?:\s+[a-z]+)*)",
    ],
    "open_source": [
        r"\b(open.?source|github|pypi|npm|package|library|framework)\b",
        r"\b(ollama|chromadb|langchain|llama|mistral)\b",
        r"\b(llm|embedding|vector|rag)\b",
    ],
    "technical": [
        r"\b(how does|explain|what is the difference)\b",
        r"\b(api|code|programming|python|javascript|database)\b",
    ],
}
_INTENT_BONUS = {"greeting": 8, "documents": 3, "fees": 3, "concierge": 1}
_COMPILED_INTENTS = {k: [re.compile(p, re.I) for p in v] for k, v in INTENT_PATTERNS.items()}


def score_intents(query: str) -> list[dict]:
    """Return ``[{"intent", "score"}]`` sorted best-first (empty if nothing matched)."""
    q = (query or "").strip()
    out = []
    for intent, patterns in _COMPILED_INTENTS.items():
        score = sum(len(p.findall(q)) * 2 for p in patterns)
        if score:
            out.append({"intent": intent, "score": min(score + _INTENT_BONUS.get(intent, 0), 10)})
    out.sort(key=lambda x: x["score"], reverse=True)
    return out
