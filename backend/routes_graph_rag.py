"""GraphRAG API — cross-country visa reasoning via knowledge graph.

Public (auth required):
  POST /api/graph-rag/query                     Hybrid graph + RAG query
  GET  /api/graph-rag/visa-free/{country_code}  Countries reachable with that visa
  POST /api/graph-rag/multi-country-plan        Minimum visa applications
  GET  /api/graph-rag/transit/{via}/{dest}       Transit visa requirements

Admin:
  POST /api/graph-rag/rebuild                   Force-rebuild the graph
  GET  /api/graph-rag/stats                     Graph node/edge counts
  GET  /api/graph-rag/subgraph/{country_code}   Neighbours of a country node
"""

from __future__ import annotations

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from admin_auth import get_current_admin_flex
from auth_utils import get_current_user
from rate_limit import RateLimit

from graph_rag import (
    build_graph,
    get_graph,
    get_graph_stats,
    hybrid_graph_rag_query,
    multi_country_plan,
    refresh_graph,
    transit_requirements,
    visa_free_with,
)

router = APIRouter(prefix="/graph-rag", tags=["graph-rag"])
logger = logging.getLogger("wehive.routes_graph_rag")


# ------------------------------------------------------------------ schemas

class QueryRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=2000)


class MultiCountryRequest(BaseModel):
    countries: List[str] = Field(..., min_length=1, max_length=20)


# ------------------------------------------------------ public endpoints

@router.post("/query", dependencies=[Depends(get_current_user), Depends(RateLimit(max_calls=20, window_seconds=60))])
async def graph_rag_query(req: QueryRequest):
    try:
        result = await hybrid_graph_rag_query(req.question)
        return result
    except RuntimeError as e:
        raise HTTPException(503, str(e))


@router.get("/visa-free/{country_code}", dependencies=[Depends(get_current_user)])
async def get_visa_free(country_code: str):
    iso2 = country_code.upper().strip()
    if len(iso2) != 2:
        raise HTTPException(400, "Provide a 2-letter ISO country code")
    try:
        results = await visa_free_with(iso2)
        return {"country": iso2, "accessible_countries": results, "count": len(results)}
    except RuntimeError as e:
        raise HTTPException(503, str(e))


@router.post("/multi-country-plan", dependencies=[Depends(get_current_user)])
async def plan_multi_country(req: MultiCountryRequest):
    result = await multi_country_plan(req.countries)
    return result


@router.get("/transit/{via_code}/{dest_code}", dependencies=[Depends(get_current_user)])
async def get_transit(via_code: str, dest_code: str):
    via = via_code.upper().strip()
    dest = dest_code.upper().strip()
    if len(via) != 2 or len(dest) != 2:
        raise HTTPException(400, "Provide 2-letter ISO country codes")
    result = await transit_requirements(via, dest)
    return result


# ------------------------------------------------------- admin endpoints

@router.post("/rebuild", dependencies=[Depends(get_current_admin_flex)])
async def rebuild_graph():
    result = await refresh_graph()
    return {"status": "rebuilt", **result}


@router.get("/stats", dependencies=[Depends(get_current_admin_flex)])
async def graph_stats():
    return get_graph_stats()


@router.get("/subgraph/{country_code}", dependencies=[Depends(get_current_admin_flex)])
async def get_subgraph(country_code: str):
    iso2 = country_code.upper().strip()
    node_id = f"country:{iso2}"
    try:
        g = get_graph()
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    if node_id not in g:
        raise HTTPException(404, f"Country {iso2} not in graph")

    attrs = dict(g.nodes[node_id])
    neighbors: list[dict] = []
    for _, target, data in g.out_edges(node_id, data=True):
        neighbors.append({"target": target, "rel": data.get("rel", ""), "label": data.get("label", "")})
    for source, _, data in g.in_edges(node_id, data=True):
        neighbors.append({"source": source, "rel": data.get("rel", ""), "label": data.get("label", "")})

    return {"node": node_id, "attributes": attrs, "neighbors": neighbors, "neighbor_count": len(neighbors)}
