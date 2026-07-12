"""Multi-Agent Orchestrator — routes complex requests to the right sub-agent.

Uses LLM-powered intent detection (fast_cheap profile) with regex fallback.
Delegates to: Eva chatbot, Document Validator, Concierge, Portal AI, Workflow.
"""

import re
from typing import Optional

RE_VISA_QA = re.compile(
    r"(visa|requirement|document|fee|processing|embassy|appointment|how long|how much|what is|tell me about)", re.I
)
RE_APPLY = re.compile(r"(apply|start|begin|create|new application|want to go|planning|trip to)", re.I)
RE_DOC_CHECK = re.compile(r"(validate|check doc|verify|is this ok|document check|scan this|check.*document)", re.I)
RE_AGENT = re.compile(r"(my student|commission|my agents|my dashboard|students? needing)", re.I)
RE_STUDENT = re.compile(r"(study|university|college|course|program|scholarship|intake|tuition)", re.I)
RE_COUNTRY = re.compile(r"\b(us|uk|ca|au|de|fr|it|es|jp|sg|ae|th|ch|np|bt|pl|at|pt|gr|hr)\b", re.I)


class OrchestratorResult:
    def __init__(self, agent: str, confidence: float, params: dict, message: str = ""):
        self.agent = agent
        self.confidence = confidence
        self.params = params
        self.message = message


async def detect_intent_llm(query: str) -> Optional[dict]:
    """Use LLM to detect intent with higher accuracy than regex."""
    try:
        from shared.model_router import chat_with_profile
        response = await chat_with_profile(
            "fast_cheap",
            [
                {"role": "system", "content": (
                    "You are an intent classifier for We Hive immigration platform. "
                    "Classify the user query into EXACTLY ONE agent category. "
                    "Return JSON: {\"agent\": \"...\", \"confidence\": 0.0-1.0, \"params\": {...}, \"reason\": \"...\"}\n\n"
                    "Agent categories:\n"
                    "- visa_qa: visa requirements, fees, documents, embassy info, general visa questions\n"
                    "- concierge: user wants to apply, start a new application, plan a trip, book appointment\n"
                    "- doc_validator: checking documents, validating scans, verifying passport\n"
                    "- portal_ai: agent dashboard, my students, commissions, performance\n"
                    "- workflow: multi-step research, country + university research, study abroad\n\n"
                    "Extract country codes (2-letter) into params.country_id if mentioned.\n"
                    "Only return JSON, nothing else."
                )},
                {"role": "user", "content": f"Classify: {query}"},
            ],
            max_tokens=200,
            temperature=0.1,
        )
        content = response.get("content", "{}") if isinstance(response, dict) else "{}"
        import json
        return json.loads(content)
    except Exception:
        return None


def detect_intent_regex(query: str) -> OrchestratorResult:
    """Regex-based intent detection (fallback)."""
    q = query.lower().strip()
    scores = {"visa_qa": 0, "concierge": 0, "doc_validator": 0, "portal_ai": 0, "workflow": 0}

    visa_matches = len(RE_VISA_QA.findall(q))
    scores["visa_qa"] += visa_matches * 2
    if RE_APPLY.search(q):
        scores["concierge"] += 5
    country_codes = RE_COUNTRY.findall(q)
    if country_codes and RE_APPLY.search(q):
        scores["concierge"] += 3
    if RE_DOC_CHECK.search(q):
        scores["doc_validator"] += 5
    if RE_AGENT.search(q):
        scores["portal_ai"] += 5
    if RE_STUDENT.search(q) and country_codes:
        scores["workflow"] += 3
    if RE_STUDENT.search(q) and not country_codes:
        scores["visa_qa"] += 2
    if country_codes and not RE_APPLY.search(q) and not RE_VISA_QA.search(q):
        scores["workflow"] += 2

    best_agent = max(scores, key=scores.get)
    best_score = scores[best_agent]

    params = {}
    if country_codes:
        params["country_id"] = country_codes[0].lower()
    if RE_STUDENT.search(q):
        params["intent"] = "student"
    elif RE_VISA_QA.search(q):
        params["intent"] = "visa_info"

    agent_names = {
        "visa_qa": "Hive (visa Q&A)",
        "concierge": "Application Concierge",
        "doc_validator": "Document Validator",
        "portal_ai": "Agent Portal AI",
        "workflow": "Multi-step Research",
    }

    return OrchestratorResult(
        agent=agent_names.get(best_agent, "Hive"),
        confidence=min(best_score / 10, 1.0),
        params=params,
        message=f'Routing to {agent_names.get(best_agent, "Hive")} (confidence: {min(best_score / 10, 1.0):.0%})',
    )


async def detect_intent(query: str) -> OrchestratorResult:
    """Detect intent using LLM first, falling back to regex."""
    llm_result = await detect_intent_llm(query)
    if llm_result and "agent" in llm_result:
        agent_map = {
            "visa_qa": "Hive (visa Q&A)",
            "concierge": "Application Concierge",
            "doc_validator": "Document Validator",
            "portal_ai": "Agent Portal AI",
            "workflow": "Multi-step Research",
        }
        agent = agent_map.get(llm_result.get("agent", "visa_qa"), "Hive (visa Q&A)")
        confidence = llm_result.get("confidence", 0.7)
        params = llm_result.get("params", {})
        return OrchestratorResult(
            agent=agent,
            confidence=confidence,
            params=params,
            message=f'[LLM] Routing to {agent} (confidence: {confidence:.0%})',
        )

    return detect_intent_regex(query)


def get_agent_endpoint(intent: OrchestratorResult) -> Optional[str]:
    mapping = {
        "Hive (visa Q&A)": "POST /api/chatbot/sessions/{id}/messages",
        "Application Concierge": "POST /api/chatbot/concierge/start",
        "Document Validator": "POST /api/scan/validate",
        "Agent Portal AI": "GET /api/agent/ai/next-actions",
        "Multi-step Research": "POST /api/chatbot/workflow",
    }
    return mapping.get(intent.agent)
