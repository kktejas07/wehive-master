"""Supervisor: classify intent → route to specialist sub-agent."""
from __future__ import annotations
import json, logging
from langgraph.graph import StateGraph, END
from .state import WeHiveAgentState
from .rag_loop import rag_app, _quick_llm

logger = logging.getLogger("wehive.supervisor")

INTENT_MAP = {
    "visa": "visa_agent",
    "university": "university_agent",
    "document": "document_agent",
    "news": "news_agent",
    "history": "history_agent",
    "general": "general_rag",
}


async def classify_intent_node(state: WeHiveAgentState) -> dict:
    query = state["messages"][-1].content[:500]  # cap for classifier prompt
    prompt = (
        'Classify the user query into ONE of: visa, university, document, news, history, general\n'
        'history = questions about the user\'s own applications, documents, or submission history\n'
        f'Query: """{query}"""\n'
        'Reply JSON only: {"intent":"<category>"}'
    )
    response = await _quick_llm(prompt)
    try:
        intent = json.loads(response).get("intent", "general")
        if intent not in INTENT_MAP:
            intent = "general"
    except Exception:
        intent = "general"
    return {"intent": intent}


async def _run_rag(state: WeHiveAgentState, agent_name: str) -> dict:
    result = await rag_app.ainvoke({
        **state,
        "retrieved_docs": [],
        "retrieval_quality": "none",
        "retry_count": 0,
        "reformulated_query": "",
    })
    return {
        "final_answer": result.get("final_answer", ""),
        "agent_name": agent_name,
        "retrieved_docs": result.get("retrieved_docs", []),
    }


async def visa_agent_node(state: WeHiveAgentState) -> dict:
    return await _run_rag(state, "visa_agent")


async def university_agent_node(state: WeHiveAgentState) -> dict:
    return await _run_rag(state, "university_agent")


async def general_rag_node(state: WeHiveAgentState) -> dict:
    return await _run_rag(state, "general_rag")


async def document_agent_node(state: WeHiveAgentState) -> dict:
    """Fetches document checklists from MongoDB (document_checklists collection)
    and answers without RAG retrieval, falling back to general RAG."""
    from guardrails import sanitize_for_regex
    query = state["messages"][-1].content
    try:
        from db import db
        words = [sanitize_for_regex(w.lower()) for w in query.split() if len(w) > 3]
        filter_q = {"$or": [{"title": {"$regex": w, "$options": "i"}} for w in words[:4]]} if words else {}
        docs_cur = db["document_checklists"].find(filter_q).limit(5)
        checklists = [d async for d in docs_cur]
        if checklists:
            ctx = "\n\n".join(
                f"{d.get('title','Checklist')}:\n" + "\n".join(f"- {item}" for item in d.get("items", []))
                for d in checklists
            )
            prompt = (
                f"You are Eva, a WeHive immigration assistant.\n"
                f"Answer using ONLY these document checklists:\n{ctx}\n\n"
                f"Question: {query[:500]}"
            )
            answer = await _quick_llm(prompt) or ""
            if answer:
                return {"final_answer": answer, "agent_name": "document_agent"}
    except Exception as exc:
        logger.debug("document_agent DB lookup failed: %s", exc)
    return await _run_rag(state, "document_agent")


async def news_agent_node(state: WeHiveAgentState) -> dict:
    """Queries the global_news collection for recent immigration news."""
    from guardrails import sanitize_for_regex
    query = state["messages"][-1].content
    try:
        from db import db
        words = [sanitize_for_regex(w.lower()) for w in query.split() if len(w) > 3]
        filter_q = {
            "status": "approved",
            "$or": [{"title": {"$regex": w, "$options": "i"}} for w in words[:4]],
        } if words else {"status": "approved"}
        news_cur = db["global_news"].find(filter_q).sort("published_at", -1).limit(5)
        items = [n async for n in news_cur]
        if items:
            ctx = "\n\n".join(
                f"[{n.get('published_at','')[:10]}] {n.get('title','')} — {n.get('summary') or n.get('content','')[:300]}"
                for n in items
            )
            prompt = (
                f"You are Eva, a WeHive immigration assistant.\n"
                f"Summarise these recent immigration news items:\n{ctx}\n\n"
                f"User asked: {query[:500]}"
            )
            answer = await _quick_llm(prompt) or ""
            if answer:
                return {"final_answer": answer, "agent_name": "news_agent"}
    except Exception as exc:
        logger.debug("news_agent DB lookup failed: %s", exc)
    return await _run_rag(state, "news_agent")


async def history_agent_node(state: WeHiveAgentState) -> dict:
    """Answers questions about the user's own applications and documents from MongoDB."""
    user_id = state.get("user_id", "")
    query = state["messages"][-1].content
    if not user_id or user_id == "anon":
        return {
            "final_answer": "Please log in to view your application history and documents.",
            "agent_name": "history_agent",
        }
    try:
        from db import db
        # Fetch last 10 applications
        apps_cur = db["applications"].find({"user_id": user_id}).sort("created_at", -1).limit(10)
        apps = [a async for a in apps_cur]
        app_lines = []
        for a in apps:
            docs = a.get("documents", [])
            doc_summary = f"{len(docs)} document(s)" if docs else "no documents"
            app_lines.append(
                f"• {a.get('visa_type', 'Application')} — {a.get('destination_country', '')} "
                f"| Status: {a.get('status', 'pending')} | {doc_summary} | "
                f"Created: {str(a.get('created_at', ''))[:10]}"
            )
        if not app_lines:
            return {
                "final_answer": "You don't have any applications on WeHive yet. Start one from the dashboard!",
                "agent_name": "history_agent",
            }
        ctx = "Your WeHive applications:\n" + "\n".join(app_lines)
        prompt = (
            f"You are Eva, a WeHive immigration assistant.\n"
            f"Answer the user's question using ONLY their personal data below.\n"
            f"Do NOT invent any data. If the answer is not in the data, say so.\n\n"
            f"{ctx}\n\nQuestion: {query[:500]}"
        )
        answer = await _quick_llm(prompt) or ctx
        return {"final_answer": answer, "agent_name": "history_agent"}
    except Exception as exc:
        logger.debug("history_agent failed: %s", exc)
    return await _run_rag(state, "history_agent")


def _route(state: WeHiveAgentState) -> str:
    return INTENT_MAP.get(state.get("intent", "general"), "general_rag")


supervisor_graph = StateGraph(WeHiveAgentState)
supervisor_graph.add_node("classify", classify_intent_node)
supervisor_graph.add_node("visa_agent", visa_agent_node)
supervisor_graph.add_node("university_agent", university_agent_node)
supervisor_graph.add_node("general_rag", general_rag_node)
supervisor_graph.add_node("document_agent", document_agent_node)
supervisor_graph.add_node("news_agent", news_agent_node)
supervisor_graph.add_node("history_agent", history_agent_node)
supervisor_graph.set_entry_point("classify")
supervisor_graph.add_conditional_edges("classify", _route, {
    "visa_agent": "visa_agent",
    "university_agent": "university_agent",
    "document_agent": "document_agent",
    "news_agent": "news_agent",
    "history_agent": "history_agent",
    "general_rag": "general_rag",
})
for _node in ("visa_agent", "university_agent", "general_rag", "document_agent", "news_agent", "history_agent"):
    supervisor_graph.add_edge(_node, END)

supervisor_app = supervisor_graph.compile()
