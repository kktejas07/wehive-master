"""Multi-Agent Orchestrator — routes complex requests to the right sub-agent.

Detects intent from natural language and delegates to:
- Eva chatbot for general visa Q&A
- Document Validator for document checks
- Concierge for full application workflow
- Portal AI for agent assistance
- Workflow agent for multi-step research (country + visa + university)
"""

import re
from typing import Optional

RE_VISA_QA = re.compile(r'(visa|requirement|document|fee|processing|embassy|appointment|how long|how much|what is|tell me about)', re.I)
RE_APPLY = re.compile(r'(apply|start|begin|create|new application|want to go|planning|trip to)', re.I)
RE_DOC_CHECK = re.compile(r'(validate|check doc|verify|is this ok|document check|scan this)', re.I)
RE_AGENT = re.compile(r'(my student|commission|my agents|my dashboard|students? needing)', re.I)
RE_STUDENT = re.compile(r'(study|university|college|course|program|scholarship|intake|tuition)', re.I)
RE_COUNTRY = re.compile(r'\b(us|uk|ca|au|de|fr|it|es|jp|sg|ae|th|ch|np|bt|pl|at|pt|gr|hr)\b', re.I)


class OrchestratorResult:
    def __init__(self, agent: str, confidence: float, params: dict, message: str = ''):
        self.agent = agent
        self.confidence = confidence
        self.params = params
        self.message = message


def detect_intent(query: str) -> OrchestratorResult:
    """Detect which agent should handle a given query."""
    q = query.lower().strip()
    scores = {
        'visa_qa': 0,
        'concierge': 0,
        'doc_validator': 0,
        'portal_ai': 0,
        'workflow': 0,
    }

    # Score: visa_qa
    visa_matches = len(RE_VISA_QA.findall(q))
    scores['visa_qa'] += visa_matches * 2

    # Score: concierge (user wants to apply)
    if RE_APPLY.search(q):
        scores['concierge'] += 5
    country_codes = RE_COUNTRY.findall(q)
    if country_codes and RE_APPLY.search(q):
        scores['concierge'] += 3

    # Score: doc_validator
    if RE_DOC_CHECK.search(q):
        scores['doc_validator'] += 5

    # Score: portal_ai
    if RE_AGENT.search(q):
        scores['portal_ai'] += 5

    # Score: workflow (student + country research)
    if RE_STUDENT.search(q) and country_codes:
        scores['workflow'] += 3
    if RE_STUDENT.search(q) and not country_codes:
        scores['visa_qa'] += 2

    # Score: workflow for general research
    if country_codes and not RE_APPLY.search(q) and not RE_VISA_QA.search(q):
        scores['workflow'] += 2

    best_agent = max(scores, key=scores.get)
    best_score = scores[best_agent]

    params = {}
    if country_codes:
        params['country_id'] = country_codes[0].lower()
    if RE_STUDENT.search(q):
        params['intent'] = 'student'
    elif RE_VISA_QA.search(q):
        params['intent'] = 'visa_info'

    agent_names = {
        'visa_qa': 'Eva (visa Q&A)',
        'concierge': 'Application Concierge',
        'doc_validator': 'Document Validator',
        'portal_ai': 'Agent Portal AI',
        'workflow': 'Multi-step Research',
    }

    return OrchestratorResult(
        agent=agent_names.get(best_agent, 'Eva'),
        confidence=min(best_score / 10, 1.0),
        params=params,
        message=f'Routing to {agent_names.get(best_agent, "Eva")} (confidence: {min(best_score / 10, 1.0):.0%})',
    )


def get_agent_endpoint(intent: OrchestratorResult) -> Optional[str]:
    """Get the API endpoint for the detected agent."""
    mapping = {
        'Eva (visa Q&A)': 'POST /api/chatbot/sessions/{id}/messages',
        'Application Concierge': 'POST /api/chatbot/concierge/start',
        'Document Validator': 'POST /api/scan/validate',
        'Agent Portal AI': 'GET /api/agent/ai/next-actions',
        'Multi-step Research': 'POST /api/chatbot/workflow',
    }
    return mapping.get(intent.agent)
