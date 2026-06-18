"""One-time bootstrap: pre-warm prompts + RAG with core data.

Called from server.py on startup. Failures are logged but do not stop
the server — the rest of the app can still run without RAG/prompts.
"""

from __future__ import annotations

import logging

logger = logging.getLogger("wehive.bootstrap_rag")


async def bootstrap_rag_and_prompts(db) -> dict:
    # NOTE: imports happen inside the function to avoid circulars at
    # module load time (agent_framework imports tool_registry which
    # imports eva_tools which imports data).
    from agent_framework import AgentSpec
    from prompts_lib import get_store, Prompt
    from agent_framework import get_agent_registry
    """Load YAML prompts, seed default prompts into Mongo, and pre-warm
    the RAG vector store with countries + universities (if empty).

    Returns a summary dict with counts of ingested items.
    """
    summary: dict = {"prompts": 0, "countries": 0, "universities": 0, "errors": []}

    try:
        prompts = get_store(db)
        prompts.reload()

        seed_prompts = [
            {
                "id": "system.hive",
                "version": 1,
                "description": "Hive default system prompt (legacy widget)",
                "tags": ["system", "hive", "default"],
                "variables": ["user_input"],
                "system": (
                    "You are Hive, a friendly visa & travel assistant for We Hive "
                    "Immigration Services (Ballari, India). Answer concisely (2-4 "
                    "sentences). Use ₹ for INR and $ for USD. Tone: warm, "
                    "professional, India-friendly. Encourage users to start "
                    "applications via the dashboard."
                ),
                "user": "{{ user_input }}",
            },
            {
                "id": "system.hive_visa",
                "version": 1,
                "description": "Hive Visa Assistant — live visa lookup, never answer visa rules from memory.",
                "tags": ["hive", "visa", "system"],
                "variables": ["agent_name", "agent_role", "context", "user_input", "today"],
                "system": (
                    "You are {{ agent_name }}, {{ agent_role }} for We Hive Immigration Services.\n\n"
                    "CRITICAL RULES — VISA ACCURACY:\n"
                    "1. For visa requirements, fees, processing times, and document lists, you MUST call the `visa_lookup` tool. Never answer visa rules from memory.\n"
                    "2. After every visa_lookup call, state the date checked (\"Checked today: {{ today }}\") and cite the provider (e.g. \"Source: Sherpa / SimpleVisa / VisaHQ\").\n"
                    "3. End every visa-related answer with: \"Confirm with the official embassy or consulate; requirements can change.\"\n"
                    "4. For background context (country info, document types, FAQ) you may use the retrieved RAG context under \"Stable knowledge\".\n"
                    "5. Use ₹ for INR and $ for USD. Be concise (2-5 sentences).\n"
                    "6. If a tool errors, say so honestly and suggest the user check the official embassy portal.\n\n"
                    "Today's date is {{ today }}.\n\n"
                    "Stable knowledge (from RAG):\n{{ context }}"
                ),
                "user": "{{ user_input }}",
            },
            {
                "id": "system.hive_travel",
                "version": 1,
                "description": "Hive Travel Planner — itinerary, flights, live prices, date-stamped.",
                "tags": ["hive", "travel", "system"],
                "variables": ["agent_name", "agent_role", "context", "user_input", "today"],
                "system": (
                    "You are {{ agent_name }}, {{ agent_role }} for We Hive.\n\n"
                    "CRITICAL RULES — TRAVEL ACCURACY:\n"
                    "1. For visa requirements of any destination, ALWAYS call `visa_lookup` (live, not RAG). Date-stamp and cite the provider.\n"
                    "2. For flight/price/availability questions, call `trip_plan` to get live itinerary + price data. Never quote prices from memory.\n"
                    "3. After every live tool call, state the date checked (\"Checked today: {{ today }}\") and cite the provider.\n"
                    "4. For stable travel guides, destination background, packing tips, and FAQs, use the retrieved RAG context.\n"
                    "5. Currency: ₹ for INR, $ for USD, local currency when relevant. 2-5 sentences unless a day-by-day plan is asked for.\n"
                    "6. Always end with: \"Prices and availability change frequently; confirm before booking.\"\n\n"
                    "Today's date is {{ today }}.\n\n"
                    "Stable travel knowledge (from RAG):\n{{ context }}"
                ),
                "user": "{{ user_input }}",
            },
            {
                "id": "system.hive_documents",
                "version": 1,
                "description": "Hive Documents Assistant — PII-safe, consent-first, audit every access.",
                "tags": ["hive", "documents", "system"],
                "variables": ["agent_name", "agent_role", "context", "user_input", "today"],
                "system": (
                    "You are {{ agent_name }}, {{ agent_role }} for We Hive.\n\n"
                    "CRITICAL RULES — DOCUMENT SAFETY:\n"
                    "1. Passports, financial statements, I-20s, and IDs are sensitive. NEVER ask the user to paste raw numbers (passport, Aadhaar, SSN) in chat. Tell them to upload the document via the secure upload in their account instead.\n"
                    "2. When the user asks \"do I have my documents ready?\" or \"what's missing?\", you may call `document_extract` ONLY if they have previously uploaded documents AND given consent. Otherwise, recommend the document checklist from RAG.\n"
                    "3. For general document checklists (tourist, student, business, work visa), use the retrieved RAG context. Cite the checklist name in [brackets].\n"
                    "4. Be concise. Use a checklist format when listing required documents. 2-6 lines is usually enough.\n"
                    "5. Documents are encrypted at rest in We Hive. Never invent document fields; only echo what the user or the tool provides.\n\n"
                    "Today's date is {{ today }}.\n\n"
                    "Document checklists and FAQ (from RAG):\n{{ context }}"
                ),
                "user": "{{ user_input }}",
            },
            {
                "id": "system.hive_study_abroad",
                "version": 1,
                "description": "Hive Study Abroad Assistant — RAG-grounded university Q&A, recommenders, scholarship match.",
                "tags": ["hive", "study", "university", "system"],
                "variables": ["agent_name", "agent_role", "context", "user_input", "today"],
                "system": (
                    "You are {{ agent_name }}, {{ agent_role }} for We Hive.\n\n"
                    "RULES — STUDY ABROAD:\n"
                    "1. For university facts (name, country, tuition, IELTS, scholarships, popular courses) use the retrieved RAG context. Cite the source in [brackets] when possible.\n"
                    "2. For \"find me a university\" / \"match me\" questions, you may call `search_universities` or `lookup_university` to fetch live data. Do not invent universities.\n"
                    "3. For acceptance probability or scholarship matching, suggest the dedicated tools: \"Use the AI University Recommender / Scholarship Matcher on the Study Abroad page for a personalised list.\"\n"
                    "4. For visa requirements to study in a country, the user should switch to the Visa Assistant (or call `visa_lookup`).\n"
                    "5. Use ₹ for INR, $ for USD. Show tuition in USD and convert approximately to INR when the user is Indian.\n"
                    "6. Be concise (2-6 sentences). Use a small list when comparing 2-3 universities.\n\n"
                    "Today's date is {{ today }}.\n\n"
                    "University knowledge (from RAG):\n{{ context }}"
                ),
                "user": "{{ user_input }}",
            },
            {
                "id": "system.scholarship_match",
                "version": 1,
                "description": "AI scholarship matcher (legacy widget tool)",
                "tags": ["scholarship", "rag"],
                "variables": ["user_profile", "candidates"],
                "system": (
                    "You are We Hive's Scholarship Matchmaker. ONLY recommend "
                    "scholarships from the candidate list. For each pick give "
                    "name, university, why it fits. 3-5 picks. End with: "
                    "Apply via We Hive to get full guidance."
                ),
                "user": (
                    "Student profile:\n{{ user_profile }}\n\n"
                    "Candidate scholarships:\n{{ candidates }}\n\n"
                    "Recommend the best matches."
                ),
            },
            {
                "id": "system.university_recommender",
                "version": 1,
                "description": "AI university recommender (legacy widget tool)",
                "tags": ["university", "rag"],
                "variables": ["user_profile", "candidates"],
                "system": (
                    "You are We Hive's AI University Counsellor. ONLY recommend "
                    "universities from the candidate list. For each pick give "
                    "name, country, why it fits, tuition. 5 picks, ranked."
                ),
                "user": (
                    "Student profile:\n{{ user_profile }}\n\n"
                    "Candidate universities:\n{{ candidates }}\n\n"
                    "Recommend the best universities."
                ),
            },
            {
                "id": "agent.react",
                "version": 1,
                "description": "ReAct agent system prompt (generic, used for custom agents)",
                "tags": ["agent", "react"],
                "variables": ["agent_name", "agent_role", "tools_description", "user_input"],
                "system": (
                    "You are {{ agent_name }}, {{ agent_role }}.\n"
                    "Use a ReAct loop. To call a tool write:\n"
                    "TOOL: name(key=value)\n"
                    "Available tools:\n{{ tools_description }}\n"
                    "After at most 6 tool calls, give a final answer."
                ),
                "user": "{{ user_input }}",
            },
            {
                "id": "agent.rag_qa",
                "version": 1,
                "description": "RAG-grounded Q&A (generic, used for custom agents)",
                "tags": ["agent", "rag"],
                "variables": ["agent_name", "agent_role", "context", "user_input"],
                "system": (
                    "You are {{ agent_name }}, {{ agent_role }}. Answer ONLY "
                    "using the context below. If the answer is not in the "
                    "context, say so. Cite sources in [brackets]."
                ),
                "user": "Context:\n{{ context }}\n\nQuestion: {{ user_input }}",
            },
        ]
        for sp in seed_prompts:
            try:
                p = Prompt(
                    id=sp["id"],
                    version=sp["version"],
                    description=sp["description"],
                    tags=sp["tags"],
                    variables=sp["variables"],
                    system=sp["system"],
                    user=sp["user"],
                )
                await prompts.save(p)
                summary["prompts"] += 1
            except Exception as e:
                logger.warning("Could not seed prompt %s: %s", sp["id"], e)

        # ── 4 Hive agents matching the UI (Visa / Travel / Documents / Study abroad) ──
        default_agents = [
            AgentSpec(
                id="hive_visa",
                name="Visa assistant",
                role="We Hive's visa assistant for Indian and global travellers",
                prompt_id="system.hive_visa",
                tools=["visa_lookup", "rag_search", "lookup_country", "get_visa_requirements", "get_application_fee"],
                provider_id="ollama",
                model="llama3.2",
                description="Live visa lookup + RAG background. Always date-stamps answers.",
                tags=["hive", "visa"],
                rag_collections=["visa_guides", "wehive_countries"],
            ),
            AgentSpec(
                id="hive_travel",
                name="Travel planner",
                role="We Hive's travel planner — itineraries, flights, prices",
                prompt_id="system.hive_travel",
                tools=["visa_lookup", "trip_plan", "rag_search", "lookup_country"],
                provider_id="ollama",
                model="llama3.2",
                description="Live trip plans + visa lookup + travel-guide RAG.",
                tags=["hive", "travel"],
                rag_collections=["travel_guides", "wehive_countries"],
            ),
            AgentSpec(
                id="hive_documents",
                name="Documents",
                role="We Hive's document checklist and review assistant",
                prompt_id="system.hive_documents",
                tools=["document_extract", "rag_search"],
                provider_id="ollama",
                model="llama3.2",
                description="PII-safe document checklist + (consented) field extraction.",
                tags=["hive", "documents"],
                rag_collections=["document_checklists"],
            ),
            AgentSpec(
                id="hive_study_abroad",
                name="Study abroad",
                role="We Hive's study-abroad advisor — university Q&A, recommenders, scholarship match",
                prompt_id="system.hive_study_abroad",
                tools=["rag_search", "search_universities", "lookup_university", "loan_referral"],
                provider_id="ollama",
                model="llama3.2",
                description="University RAG + live search + loan referral.",
                tags=["hive", "study", "university"],
                rag_collections=["university_data", "wehive_universities"],
            ),
        ]
        reg = get_agent_registry(db)
        existing = {a.id for a in await reg.list()}
        for a in default_agents:
            if a.id not in existing:
                try:
                    await reg.upsert(a)
                except Exception as e:
                    logger.warning("Could not seed agent %s: %s", a.id, e)

    except Exception as e:
        logger.exception("Prompt/agent bootstrap failed: %s", e)
        summary["errors"].append(f"prompts: {e}")

    try:
        from vector_store import collection_count
        from rag_ingest import ingest_mongo_collection

        if collection_count("wehive_countries") == 0:
            try:
                res = await ingest_mongo_collection(
                    collection="wehive_countries",
                    mongo_collection=db["countries_v2"],
                    text_fields=["name", "capital", "region", "subregion", "visa_types", "highlights"],
                    id_field="id",
                    extra_metadata={"type": "country"},
                )
                summary["countries"] = res.get("chunks", 0)
            except Exception as e:
                logger.warning("Country ingest failed: %s", e)
                summary["errors"].append(f"countries: {e}")

        if collection_count("wehive_universities") == 0:
            try:
                res = await ingest_mongo_collection(
                    collection="wehive_universities",
                    mongo_collection=db["universities_v2"],
                    text_fields=[
                        "name", "country", "city", "courses", "scholarships",
                        "tuition_usd", "ielts_min", "qs_rank", "times_rank",
                    ],
                    id_field="id",
                    extra_metadata={"type": "university"},
                )
                summary["universities"] = res.get("chunks", 0)
            except Exception as e:
                logger.warning("University ingest failed: %s", e)
                summary["errors"].append(f"universities: {e}")
    except Exception as e:
        logger.exception("RAG bootstrap failed: %s", e)
        summary["errors"].append(f"rag: {e}")

    # ── Hive namespaced RAG (visa_guides, travel_guides, document_checklists, university_data) ──
    try:
        from seed_hive_rag import seed_hive_rag as _seed_hive
        hive_summary = await _seed_hive(db)
        for k, v in hive_summary.items():
            summary[k] = v
    except Exception as e:
        logger.warning("Hive RAG seed failed: %s", e)
        summary["errors"].append(f"hive_rag: {e}")

    # ── Hive self-learning: mine recent feeds, auto-apply improved prompts ──
    # Greps the most recent Hive conversations and asks the LLM to improve
    # the 4 system prompts. New versions are saved to Mongo; the next
    # /agents-v2/{id}/run call picks them up automatically. Disable with
    # HIVE_SELF_LEARN=0; bypass thresholds with HIVE_SELF_LEARN_FORCE=1.
    try:
        from seed_self_learn import seed_self_learn as _seed_self_learn
        learn_res = await _seed_self_learn(db)
        summary["self_learn"] = learn_res
    except Exception as e:
        logger.warning("Hive self-learn seed failed: %s", e)
        summary["errors"].append(f"self_learn: {e}")

    if summary["errors"]:
        logger.warning("RAG/prompts bootstrap completed with errors: %s", summary)
    else:
        logger.info(
            "RAG/prompts bootstrap done — prompts=%d countries=%d universities=%d",
            summary["prompts"], summary["countries"], summary["universities"],
        )
    return summary
