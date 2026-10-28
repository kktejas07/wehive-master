"""GraphRAG — in-memory visa knowledge graph for cross-country reasoning.

Builds a directed graph from visa_rules.py data (requirements, Schengen
membership, territories) and country names from MongoDB.  Supports:
  - visa_free_with(): countries reachable with a given country's visa
  - multi_country_plan(): minimum visa applications for a multi-stop trip
  - transit_requirements(): transit visa lookup
  - hybrid_graph_rag_query(): graph + vector RAG combined with an LLM answer
"""

from __future__ import annotations

import logging
import re
import threading
from datetime import datetime
from typing import Optional

logger = logging.getLogger("wehive.graph_rag")

_graph = None  # nx.DiGraph, set by build_graph
_graph_lock = threading.Lock()
_built_at: Optional[datetime] = None

# Country-name regex for question parsing (populated after graph build)
_COUNTRY_NAMES: dict[str, str] = {}  # lowercase name -> iso2
_ISO2_RE = re.compile(r"\b([A-Z]{2})\b")


def _ensure_nx():
    try:
        import networkx as nx
        return nx
    except ImportError:
        raise RuntimeError("networkx is required: pip install networkx")


# ---------------------------------------------------------------------- build
async def build_graph():
    """Build the visa knowledge graph from visa_rules.py + countries_v2."""
    nx = _ensure_nx()
    import visa_rules

    g = nx.DiGraph()

    # Requirement nodes
    for code, label in visa_rules.REQUIREMENT_LABELS.items():
        g.add_node(f"requirement:{code}", kind="requirement", code=code, label=label)

    # Load country names from MongoDB (best-effort)
    names: dict[str, str] = {}
    try:
        from db import db
        async for doc in db["countries_v2"].find({}, {"_id": 0, "id": 1, "name": 1}):
            iso2 = (doc.get("id") or "").upper()
            name = doc.get("name") or iso2
            if iso2:
                names[iso2] = name
    except Exception as e:
        logger.warning("Could not load country names from DB: %s", e)

    # Country nodes + requirement edges from India
    for iso2, req in visa_rules.REQUIREMENTS.items():
        name = names.get(iso2, iso2)
        g.add_node(f"country:{iso2}", kind="country", iso2=iso2, name=name,
                    requirement=req, schengen=iso2 in visa_rules.SCHENGEN)
        g.add_edge(f"country:IN", f"country:{iso2}", rel=req,
                    label=visa_rules.REQUIREMENT_LABELS.get(req, req))

    # Schengen membership edges
    for iso2 in visa_rules.SCHENGEN:
        g.add_edge(f"country:{iso2}", "requirement:schengen_member", rel="schengen_member")

    # Schengen-access microstates
    for iso2, parent in visa_rules.SCHENGEN_ACCESS.items():
        name = names.get(iso2, iso2)
        if f"country:{iso2}" not in g:
            g.add_node(f"country:{iso2}", kind="country", iso2=iso2, name=name,
                        requirement=visa_rules.V, schengen=True)
        g.add_edge(f"country:{iso2}", f"country:{parent}", rel="schengen_access",
                    label=f"Accessible via {parent} (Schengen)")

    # Territory edges
    for iso2, (parent, note) in visa_rules.TERRITORIES.items():
        name = names.get(iso2, iso2)
        if f"country:{iso2}" not in g:
            g.add_node(f"country:{iso2}", kind="country", iso2=iso2, name=name,
                        requirement=visa_rules.REQUIREMENTS.get(parent, visa_rules.V),
                        schengen=False)
        g.add_edge(f"country:{iso2}", f"country:{parent}", rel="territory_of", label=note)

    global _graph, _built_at, _COUNTRY_NAMES
    with _graph_lock:
        _graph = g
        _built_at = datetime.utcnow()
    _COUNTRY_NAMES = {v.lower(): k for k, v in names.items() if len(k) == 2}
    logger.info("GraphRAG built: %d nodes, %d edges", g.number_of_nodes(), g.number_of_edges())
    return g


def get_graph():
    """Return the current graph or raise if not built."""
    with _graph_lock:
        if _graph is None:
            raise RuntimeError("Graph not built yet — call build_graph() first")
        return _graph


async def refresh_graph() -> dict:
    await build_graph()
    g = get_graph()
    ts = _built_at.isoformat() if _built_at else ""
    try:
        from db import db
        await db["graph_rag_meta"].update_one(
            {"_id": "current"},
            {"$set": {"built_at": ts, "nodes": g.number_of_nodes(), "edges": g.number_of_edges()}},
            upsert=True,
        )
    except Exception as e:
        logger.warning("Could not persist graph meta: %s", e)
    return {"nodes": g.number_of_nodes(), "edges": g.number_of_edges(), "built_at": ts}


def get_graph_stats() -> dict:
    with _graph_lock:
        if _graph is None:
            return {"nodes": 0, "edges": 0, "built_at": None}
        return {
            "nodes": _graph.number_of_nodes(),
            "edges": _graph.number_of_edges(),
            "built_at": _built_at.isoformat() if _built_at else None,
        }


# ------------------------------------------------------------------ queries

def _node_name(g, node_id: str) -> str:
    return g.nodes[node_id].get("name", node_id) if node_id in g else node_id


async def visa_free_with(visa_country_iso2: str) -> list[str | dict]:
    """Countries reachable if you hold a visa for *visa_country_iso2*."""
    import visa_rules

    iso2 = visa_country_iso2.upper()
    g = get_graph()
    results: list[dict] = []

    is_schengen = iso2 in visa_rules.SCHENGEN

    # 1) If Schengen visa, all Schengen + Schengen-access countries
    if is_schengen:
        for sc in visa_rules.SCHENGEN:
            if sc != iso2:
                results.append({"country": sc, "name": _node_name(g, f"country:{sc}"),
                                "access_type": "schengen_member"})
        for acc, _parent in visa_rules.SCHENGEN_ACCESS.items():
            results.append({"country": acc, "name": _node_name(g, f"country:{acc}"),
                            "access_type": "schengen_access"})

    # 2) Territories of this country
    for terr, (parent, note) in visa_rules.TERRITORIES.items():
        if parent == iso2:
            results.append({"country": terr, "name": _node_name(g, f"country:{terr}"),
                            "access_type": "territory"})

    # 3) Countries visa-free for India that don't need any visa
    for dest, req in visa_rules.REQUIREMENTS.items():
        if req in (visa_rules.F, visa_rules.A) and dest != "IN":
            already = {r["country"] for r in results}
            if dest not in already:
                results.append({"country": dest, "name": _node_name(g, f"country:{dest}"),
                                "access_type": "visa_free_for_india"})

    return results


async def multi_country_plan(countries: list[str], home: str = "IN") -> dict:
    """Minimum visa applications for visiting a set of countries."""
    import visa_rules

    countries = [c.upper() for c in countries if c.strip()]
    if not countries:
        return {"visa_count": 0, "groups": [], "visa_free": [], "plan": "No destinations provided."}

    visa_free: list[str] = []
    schengen_needed: list[str] = []
    individual_visa: list[str] = []

    for iso2 in countries:
        req = visa_rules.REQUIREMENTS.get(iso2)
        if req in (visa_rules.F, visa_rules.A, visa_rules.EA):
            visa_free.append(iso2)
        elif iso2 in visa_rules.SCHENGEN or iso2 in visa_rules.SCHENGEN_ACCESS:
            schengen_needed.append(iso2)
        else:
            individual_visa.append(iso2)

    groups: list[dict] = []
    if schengen_needed:
        groups.append({"visa": "Schengen", "countries": schengen_needed, "applications": 1})
    for iso2 in individual_visa:
        groups.append({"visa": iso2, "countries": [iso2], "applications": 1})

    visa_count = len(groups)
    lines = []
    if visa_free:
        lines.append(f"No visa needed for: {', '.join(visa_free)}.")
    if schengen_needed:
        lines.append(f"One Schengen visa covers: {', '.join(schengen_needed)}.")
    for iso2 in individual_visa:
        lines.append(f"Separate visa required for {iso2}.")
    lines.append(f"Total visa applications: {visa_count}.")

    return {
        "visa_count": visa_count,
        "groups": groups,
        "visa_free": visa_free,
        "plan": " ".join(lines),
    }


async def transit_requirements(via_iso2: str, dest_iso2: str) -> dict:
    """Transit visa requirements when connecting through *via_iso2* en route to *dest_iso2*."""
    import visa_rules

    via = via_iso2.upper()
    dest = dest_iso2.upper()
    req = visa_rules.REQUIREMENTS.get(via)

    if req in (visa_rules.F, visa_rules.A):
        return {"transit_visa_required": False, "requirement": req,
                "notes": f"India has {visa_rules.REQUIREMENT_LABELS.get(req, '')} access to {via}; "
                         f"transit without a visa is typically allowed."}

    if via in visa_rules.SCHENGEN:
        return {"transit_visa_required": True, "requirement": "schengen_transit",
                "notes": f"{via} is Schengen: you need at least an Airport Transit Visa (ATV) "
                         f"unless you hold a valid Schengen, US, CA, or UK visa."}

    return {"transit_visa_required": True, "requirement": req or visa_rules.V,
            "notes": f"Indians need a visa for {via}; check whether the country offers "
                     "a transit visa or TWOV (Transit Without Visa) programme."}


# -------------------------------------------------------- hybrid graph+RAG

def _extract_countries(text: str) -> list[str]:
    """Pull country ISO-2 codes and names from free text."""
    found: set[str] = set()
    for m in _ISO2_RE.finditer(text):
        code = m.group(1)
        if code in (get_graph().nodes.get(f"country:{code}") and {code} or set()):
            found.add(code)
    lower = text.lower()
    for name, iso2 in _COUNTRY_NAMES.items():
        if name in lower:
            found.add(iso2)
    return sorted(found)


async def hybrid_graph_rag_query(question: str, user_id: str = "") -> dict:
    """Combine graph traversal + vector RAG, then answer via LLM."""
    from agent_framework import _llm_call, _retrieve_rag_context

    graph_parts: list[str] = []
    countries = _extract_countries(question)

    for iso2 in countries[:5]:
        node = f"country:{iso2}"
        g = get_graph()
        if node not in g:
            continue
        attrs = g.nodes[node]
        name = attrs.get("name", iso2)
        req = attrs.get("requirement", "unknown")
        from visa_rules import REQUIREMENT_LABELS
        graph_parts.append(f"{name} ({iso2}): {REQUIREMENT_LABELS.get(req, req)}")
        if attrs.get("schengen"):
            graph_parts.append(f"  → {name} is a Schengen member.")
        for _, target, data in g.out_edges(node, data=True):
            rel = data.get("rel", "")
            if rel in ("territory_of", "schengen_access"):
                graph_parts.append(f"  → {data.get('label', rel)}")

    graph_context = "\n".join(graph_parts) if graph_parts else ""
    rag_context = await _retrieve_rag_context(question, ["wehive_kb", "wehive_countries"], k=4)

    combined = ""
    if graph_context:
        combined += f"Visa knowledge graph:\n{graph_context}\n\n"
    if rag_context:
        combined += f"Retrieved documents:\n{rag_context}\n\n"

    system = (
        "You are Hive, WeHive's visa advisor. Use the provided knowledge-graph facts "
        "and retrieved documents to give an accurate, concise answer. "
        "Cite the source of your information where possible."
    )
    user_prompt = f"Context:\n{combined}\nQuestion: {question}" if combined else question

    answer, _info = await _llm_call(user_id, system, user_prompt)

    return {"answer": answer, "graph_context": graph_context, "rag_context": rag_context}
