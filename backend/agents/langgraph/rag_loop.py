"""Self-correcting RAG loop: retrieve → grade → reformulate (max 3 retries)."""
from __future__ import annotations
import asyncio, json, logging, os
from langgraph.graph import StateGraph, END
from .state import WeHiveAgentState

logger = logging.getLogger("wehive.rag_loop")
MAX_RETRIES = 3


async def _quick_llm(prompt: str) -> str:
    from config import OLLAMA_HOST as host, OLLAMA_GRADE_MODEL as model
    # Use langfuse.openai for automatic generation tracing; fall back to httpx
    try:
        from langfuse.openai import AsyncOpenAI
        client = AsyncOpenAI(base_url=f"{host}/v1", api_key="ollama")
        resp = await client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.choices[0].message.content.strip()
    except Exception:
        pass
    try:
        import httpx
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(f"{host}/api/generate", json={
                "model": model, "prompt": prompt, "stream": False,
            })
            r.raise_for_status()
            return r.json().get("response", "").strip()
    except Exception as e:
        logger.warning("Quick LLM failed: %s", e)
        return ""


_INTENT_COLLECTIONS = {
    "visa": ["wehive_kb", "wehive_countries"],
    "university": ["wehive_kb", "wehive_universities"],
    "document": ["wehive_kb"],
    "news": ["wehive_kb"],
    "general": ["wehive_kb"],
}


async def load_memory_node(state: WeHiveAgentState) -> dict:
    user_id = state.get("user_id", "")
    if not user_id or user_id == "eval_bot":
        return {"memory_context": ""}
    query = state["messages"][-1].content
    try:
        from student_memory import student_memory
        result = student_memory.search(user_id, query)
        memories = result.get("results", result) if isinstance(result, dict) else result
        ctx = "\n".join(
            m.get("memory", "") for m in memories[:5] if isinstance(m, dict) and m.get("memory")
        )
        return {"memory_context": ctx}
    except Exception as exc:
        logger.debug("load_memory_node failed: %s", exc)
        return {"memory_context": ""}


async def retrieve_node(state: WeHiveAgentState) -> dict:
    from qdrant_store import hybrid_search, rrf_merge
    from reranker import reranker
    query = state.get("reformulated_query") or state["messages"][-1].content
    intent = state.get("intent", "general")
    user_id = state.get("user_id", "")
    collections = _INTENT_COLLECTIONS.get(intent, ["wehive_kb"])
    searches = [hybrid_search(col, query, top_k=30) for col in collections]
    # Include user's own documents when user_id is available
    if user_id:
        searches.append(
            hybrid_search("wehive_user_docs", query, top_k=10,
                          filter_dict={"user_id": user_id})
        )
    per_collection = await asyncio.gather(*searches, return_exceptions=True)
    valid = [r for r in per_collection if isinstance(r, list)]
    merged = rrf_merge(valid) if len(valid) > 1 else (valid[0] if valid else [])
    top_docs = reranker.rerank(query, merged, top_n=5)
    return {"retrieved_docs": top_docs}


async def grade_retrieval_node(state: WeHiveAgentState) -> dict:
    if not state.get("retrieved_docs"):
        return {"retrieval_quality": "none"}
    query = state["messages"][-1].content
    snippet = "\n".join(d["text"][:150] for d in state["retrieved_docs"][:3])
    prompt = (
        f'Are these docs relevant to answer "{query}"?\n'
        f'Docs: {snippet}\n'
        'Reply JSON only: {"quality":"good"} or {"quality":"poor"}'
    )
    response = await _quick_llm(prompt)
    try:
        quality = json.loads(response).get("quality", "poor")
    except Exception:
        quality = "good" if state.get("retrieved_docs") else "poor"
    return {"retrieval_quality": quality}


async def reformulate_node(state: WeHiveAgentState) -> dict:
    original = state["messages"][-1].content
    prompt = f'Reformulate for immigration knowledge base: "{original}"\nReturn only the new query.'
    new_query = await _quick_llm(prompt) or original
    return {
        "reformulated_query": new_query,
        "retry_count": state.get("retry_count", 0) + 1,
    }


async def generate_answer_node(state: WeHiveAgentState) -> dict:
    query = state["messages"][-1].content
    docs = state.get("retrieved_docs", [])
    context = "\n\n".join(f"[{i+1}] {d['text']}" for i, d in enumerate(docs))
    memory = state.get("memory_context", "")
    mem_section = f"\nStudent profile:\n{memory}\n" if memory else ""
    prompt = (
        f"You are Eva, WeHive's immigration assistant.{mem_section}\n"
        f"Answer using ONLY the context below. Cite [1],[2] etc.\n\n"
        f"Context:\n{context}\n\nQuestion: {query}"
    )
    try:
        from ai_marketplace import marketplace
        user_id = state.get("user_id", "")
        if user_id and user_id != "eval_bot":
            answer = await marketplace.chat(
                user_id=user_id, system_prompt="", user_prompt=prompt, max_tokens=1024
            )
        else:
            answer = await _quick_llm(prompt)
    except Exception as e:
        logger.warning("Generate answer failed: %s", e)
        answer = await _quick_llm(prompt) or "I couldn't generate an answer. Please try again."
    return {"final_answer": answer}


def _route_after_grade(state: WeHiveAgentState) -> str:
    if state.get("retrieval_quality") == "good":
        return "generate"
    if state.get("retry_count", 0) >= MAX_RETRIES:
        return "generate"
    return "reformulate"


rag_graph = StateGraph(WeHiveAgentState)
rag_graph.add_node("load_memory", load_memory_node)
rag_graph.add_node("retrieve", retrieve_node)
rag_graph.add_node("grade", grade_retrieval_node)
rag_graph.add_node("reformulate", reformulate_node)
rag_graph.add_node("generate", generate_answer_node)
rag_graph.set_entry_point("load_memory")
rag_graph.add_edge("load_memory", "retrieve")
rag_graph.add_edge("retrieve", "grade")
rag_graph.add_conditional_edges("grade", _route_after_grade, {
    "generate": "generate",
    "reformulate": "reformulate",
})
rag_graph.add_edge("reformulate", "retrieve")
rag_graph.add_edge("generate", END)
rag_app = rag_graph.compile()
