"""Seed RAG content for the Hive namespaced collections.

The Hive assistant uses 4 stable RAG collections alongside the
existing wehive_countries / wehive_universities:

  - visa_guides           background on visa categories, embassies, FAQs
  - travel_guides         city guides, packing tips, safety, best seasons
  - document_checklists   per-visa-type document checklists
  - university_data       mirrors wehive_universities for the Study Abroad agent

Content is plain English. Each item is a short chunk so the embedder
produces good vectors. Run this once on first boot; subsequent boots
are a no-op because rag_ingest uses `upsert` with deterministic IDs.

CLI:   python backend/seed_hive_rag.py
API:   already invoked from bootstrap_rag.bootstrap_rag_and_prompts().
"""

from __future__ import annotations

import logging
import os
import uuid
from typing import Iterable

logger = logging.getLogger("wehive.seed_hive_rag")


# ─────────────────────────────────────────────────────────────────────────
# Seed content — kept inline so the assistant works on a fresh DB
# ─────────────────────────────────────────────────────────────────────────

VISA_GUIDES: list[dict] = [
    {
        "id": "visa-101-types",
        "title": "Common visa types explained",
        "body": (
            "Tourist / visitor visa: short stay (usually 14-90 days) for leisure, "
            "visiting family, or business meetings. Usually no work allowed.\n"
            "Business visa: meetings, conferences, trade shows. Letter of invitation "
            "and company registration often required.\n"
            "Student visa: full-time study at a recognised institution. "
            "Acceptance letter, proof of funds, and sometimes biometrics.\n"
            "Work visa: sponsored employment. Usually needs a job offer and a "
            "labour-market test in the destination country.\n"
            "Transit visa: airport layover in a third country, 24-96 hours.\n"
            "Always confirm the visa category with the official embassy — the "
            "exact name and sub-types vary by country."
        ),
    },
    {
        "id": "visa-102-indian-passport-overview",
        "title": "Visa overview for Indian passport holders",
        "body": (
            "Indian passport holders currently need a visa for most countries, "
            "with a few notable visa-free or e-visa destinations: Nepal, Bhutan, "
            "Maldives (up to 90 days), Mauritius, Sri Lanka (e-visa), Seychelles, "
            "and a handful of Caribbean states.\n"
            "Schengen visas are short-stay (Type C, up to 90 days in 180). "
            "US B1/B2 is a multiple-entry visitor visa. UK Standard Visitor is "
            "6 months. Canada visitor visa is multiple-entry by default.\n"
            "Processing times and fees change frequently — always check with the "
            "embassy or consulate before applying."
        ),
    },
    {
        "id": "visa-103-fees-and-timelines",
        "title": "Typical fees and processing times (India origin)",
        "body": (
            "Schengen: €90 for adults, €45 for children 6-12, free under 6. "
            "Processing 15-45 working days. Apply at the country of main destination.\n"
            "US B1/B2: $185 MRV fee, non-refundable. Wait times for B1/B2 "
            "interview slots in India range from a few weeks to several months.\n"
            "UK Standard Visitor: £127 (6-month), £470 (2-year), £848 (5-year), "
            "$1235 (10-year). Service-fee tiers apply via VFS.\n"
            "Canada visitor: CAD 100 per person. eTA not applicable to Indians.\n"
            "Australia visitor (subclass 600): AUD 190. ETA not available to "
            "Indian passport holders."
        ),
    },
    {
        "id": "visa-104-documents-general",
        "title": "General documents most embassies ask for",
        "body": (
            "Valid passport (usually 6+ months validity beyond travel date, "
            "2 blank pages). Old passports showing travel history.\n"
            "Completed application form and recent passport-size photos.\n"
            "Cover letter stating purpose, duration, and who is funding the trip.\n"
            "Bank statements (last 3-6 months) and IT returns (last 2-3 years).\n"
            "Hotel bookings and round-trip flight reservation (not paid tickets).\n"
            "Travel insurance (Schengen minimum €30,000 medical coverage).\n"
            "For business: invitation letter, company ID, GST certificate."
        ),
    },
]

TRAVEL_GUIDES: list[dict] = [
    {
        "id": "travel-201-japan",
        "title": "Japan travel guide for Indian travellers",
        "body": (
            "Best seasons: March-May (cherry blossom) and October-November "
            "(autumn colours). Summer is hot and humid; winter is dry and "
            "snowy on the Sea of Japan side.\n"
            "Currency: Japanese Yen (¥). 1 INR ≈ 1.7 JPY. Cash is still king "
            "in small restaurants; carry yen from 7-Eleven ATMs.\n"
            "Connectivity: pocket Wi-Fi (~¥800/day) or eSIM (Ubigi, Airalo) "
            "works well. JR Pass is worth it for 7+ day multi-city trips.\n"
            "Tipping is not customary. Bow, take off shoes indoors, do not "
            "eat while walking. Trains are punctual to the minute."
        ),
    },
    {
        "id": "travel-202-schengen",
        "title": "Schengen trip planning basics",
        "body": (
            "26 countries, one visa. Apply at the country of main destination "
            "(longest stay) or first entry if stays are equal.\n"
            "Schengen area: France, Germany, Italy, Spain, Netherlands, "
            "Switzerland, Austria, Greece, Portugal, Czech Republic, and others.\n"
            "90 days in any 180-day rolling window. Plan multi-city trips in "
            "clusters to make the most of the allowance.\n"
            "Travel by Eurail pass or budget airlines (Ryanair, easyJet, "
            "Vueling). Book trains early for cheaper fares."
        ),
    },
    {
        "id": "travel-203-uk",
        "title": "United Kingdom travel guide",
        "body": (
            "Best months: May-September. Winter days are short (sunset ~4pm "
            "in London in December).\n"
            "Currency: Pound Sterling (£). 1 INR ≈ £0.009. Contactless is "
            "accepted almost everywhere; even street performers take cards.\n"
            "London Underground (Tube) runs till ~midnight. Buy a daily cap "
            "Oyster card or use contactless.\n"
            "Tipping 10-12.5% in restaurants is standard. Pubs are table-service "
            "for food; order drinks at the bar."
        ),
    },
    {
        "id": "travel-204-uae",
        "title": "UAE (Dubai + Abu Dhabi) travel guide",
        "body": (
            "Indian passport holders get a 30-day visit visa on arrival for "
            "AED 100 (free for some airlines' tickets) or a 14-day visa for "
            "AED 50. Pre-applied tourist visas start at USD 95.\n"
            "Currency: UAE Dirham (AED). Pegged to USD at 3.6725.\n"
            "Best months: November-March. Summer (May-Sep) is brutally hot "
            "(45°C+). Malls and metro are heavily air-conditioned.\n"
            "Dress modestly in mosques and government buildings. Public "
            "drinking and public displays of affection are illegal."
        ),
    },
    {
        "id": "travel-205-budget-tips",
        "title": "Travel budget tips for Indian travellers",
        "body": (
            "Book flights 6-8 weeks in advance for international. Use fare "
            "calendars (Skyscanner, Google Flights) for the cheapest days.\n"
            "Use a forex card (HDFC, ICICI, Niyo) instead of cash — better "
            "rates, lower forex margin, blocked from overspend.\n"
            "Travel insurance is non-negotiable for Schengen; recommended "
            "everywhere. ~₹500-1500 for a 2-week trip.\n"
            "Stay in hostels or budget hotels booked direct. Sim cards at "
            "airport kiosks for the first day, then local prepaid."
        ),
    },
]

DOCUMENT_CHECKLISTS: list[dict] = [
    {
        "id": "docs-301-tourist-schengen",
        "title": "Schengen tourist visa document checklist",
        "body": (
            "1. Passport (6+ months validity, 2 blank pages, last 10 years' "
            "copies of all stamped pages)\n"
            "2. Schengen application form (typed, signed)\n"
            "3. Two recent 35x45mm white-background photos\n"
            "4. Cover letter (purpose, dates, funding, itinerary)\n"
            "5. Travel insurance (min €30,000, Schengen area, full duration)\n"
            "6. Round-trip flight reservation\n"
            "7. Hotel bookings for all nights (or host invitation)\n"
            "8. Bank statements (last 3-6 months, stamped)\n"
            "9. IT returns (last 2-3 years)\n"
            "10. Leave letter from employer / bonafide letter from college\n"
            "11. Salary slips (last 3 months) / proof of business\n"
            "12. For self-employed: GST, company registration, balance sheet"
        ),
    },
    {
        "id": "docs-302-student-f1",
        "title": "US F1 student visa document checklist",
        "body": (
            "1. Valid passport (at least 6 months beyond programme end)\n"
            "2. I-20 from SEVP-approved US school\n"
            "3. SEVIS fee receipt (I-901, $350)\n"
            "4. DS-160 confirmation page (barcode)\n"
            "5. MRV fee receipt ($185)\n"
            "6. Interview appointment letter\n"
            "7. Academic transcripts, degree certificates, TOEFL/IELTS, GRE/GMAT\n"
            "8. Financial documents: bank statements, sponsor affidavit, loan "
            "sanction letter, liquid assets covering tuition + living for 1 year\n"
            "9. Statement of purpose / study plan\n"
            "10. Resume, research/work experience letters\n"
            "11. Ties-to-home proof: property, family, employment offer letter"
        ),
    },
    {
        "id": "docs-303-uk-standard-visitor",
        "title": "UK Standard Visitor visa document checklist",
        "body": (
            "1. Valid passport (6+ months beyond travel)\n"
            "2. Completed online application (printed)\n"
            "3. Two recent photos (45x35mm, white background)\n"
            "4. Cover letter with itinerary, accommodation, funding\n"
            "5. Bank statements (last 6 months)\n"
            "6. Employment letter / payslips (last 3 months)\n"
            "7. Travel itinerary and hotel bookings\n"
            "8. Round-trip flight reservation\n"
            "9. For sponsored trips: sponsor's letter, ID, bank statements\n"
            "10. For business: invitation letter, company registration"
        ),
    },
    {
        "id": "docs-304-canada-visitor",
        "title": "Canada visitor visa document checklist",
        "body": (
            "1. Valid passport (6+ months beyond travel)\n"
            "2. IMM 5257 application form (completed online via IRCC portal)\n"
            "3. Two photos meeting IRCC specs\n"
            "4. Cover letter explaining purpose of visit\n"
            "5. Travel history and previous visas (photocopies)\n"
            "6. Bank statements (last 6 months, ~CAD 3,000-5,000+ per month)\n"
            "7. Employment letter, payslips, IT returns\n"
            "8. Letter of invitation from host (if visiting family/friend)\n"
            "9. Travel insurance (recommended)\n"
            "10. Flight reservation and hotel bookings"
        ),
    },
    {
        "id": "docs-305-australia-subclass-600",
        "title": "Australia visitor visa (subclass 600) checklist",
        "body": (
            "1. Valid passport\n"
            "2. ImmiAccount application (form 1419)\n"
            "3. One recent photo\n"
            "4. Cover letter and travel itinerary\n"
            "5. Bank statements showing AUD 5,000+ available\n"
            "6. Employment evidence / business registration\n"
            "7. Invitation letter (if applicable)\n"
            "8. Travel insurance\n"
            "9. Health declaration (may need chest x-ray for stays >3 months)\n"
            "10. For 600-stream business: invitation, company ID, meeting agenda"
        ),
    },
]


# ─────────────────────────────────────────────────────────────────────────
# Ingestion helpers
# ─────────────────────────────────────────────────────────────────────────

async def _upsert_chunks(collection: str, items: Iterable[dict], chunk_chars: int = 1200) -> int:
    """Embed and upsert each item as one or more chunks. Returns count."""
    try:
        from vector_store import get_collection, upsert_documents
        from ollama_embeddings import embed_texts
    except Exception as e:
        logger.warning("Vector store unavailable: %s", e)
        return 0

    docs: list[dict] = []
    for it in items:
        body = it.get("body", "")
        title = it.get("title", it.get("id", ""))
        sid = it.get("id") or str(uuid.uuid4())
        # Single-chunk per item for short guides; multi-chunk for long ones
        if len(body) <= chunk_chars:
            docs.append({
                "id": f"{collection}:{sid}",
                "text": f"{title}\n\n{body}",
                "metadata": {
                    "source_key": sid,
                    "name": title,
                    "type": "hive_doc",
                    "namespace": collection,
                },
            })
        else:
            for i, start in enumerate(range(0, len(body), chunk_chars)):
                piece = body[start:start + chunk_chars]
                docs.append({
                    "id": f"{collection}:{sid}:{i}",
                    "text": f"{title} (part {i + 1})\n\n{piece}",
                    "metadata": {
                        "source_key": sid,
                        "name": title,
                        "type": "hive_doc",
                        "namespace": collection,
                        "part": i,
                    },
                })
    if not docs:
        return 0
    try:
        vecs = await embed_texts([d["text"] for d in docs])
    except Exception as e:
        logger.warning("Embedding failed: %s", e)
        return 0
    if not vecs or len(vecs) != len(docs):
        logger.warning("Embedding count mismatch for %s", collection)
        return 0
    payload = []
    for d, v in zip(docs, vecs):
        payload.append({
            "id": d["id"],
            "document": d["text"],
            "embedding": v,
            "metadata": d["metadata"],
        })
    try:
        get_collection(collection)
        upsert_documents(collection, payload)
        return len(payload)
    except Exception as e:
        logger.warning("Upsert into %s failed: %s", collection, e)
        return 0


async def seed_hive_rag(db) -> dict:
    """Idempotently seed the 4 Hive RAG collections. Called by bootstrap_rag."""
    summary: dict = {"visa_guides": 0, "travel_guides": 0, "document_checklists": 0, "university_data": 0}

    # 1. visa_guides
    try:
        n = await _upsert_chunks("visa_guides", VISA_GUIDES)
        summary["visa_guides"] = n
    except Exception as e:
        logger.warning("visa_guides seed failed: %s", e)

    # 2. travel_guides
    try:
        n = await _upsert_chunks("travel_guides", TRAVEL_GUIDES)
        summary["travel_guides"] = n
    except Exception as e:
        logger.warning("travel_guides seed failed: %s", e)

    # 3. document_checklists
    try:
        n = await _upsert_chunks("document_checklists", DOCUMENT_CHECKLISTS)
        summary["document_checklists"] = n
    except Exception as e:
        logger.warning("document_checklists seed failed: %s", e)

    # 4. university_data — mirror wehive_universities so the Study Abroad
    #    agent has a dedicated namespace; the main wehive_universities
    #    collection is also kept for the existing agents.
    try:
        from rag_ingest import ingest_mongo_collection
        from vector_store import collection_count
        if collection_count("university_data") == 0:
            res = await ingest_mongo_collection(
                collection="university_data",
                mongo_collection=db["universities_v2"],
                text_fields=[
                    "name", "country", "city", "courses", "scholarships",
                    "tuition_usd", "ielts_min", "qs_rank", "times_rank",
                    "popular_courses", "intakes", "description",
                ],
                id_field="id",
                extra_metadata={"type": "university", "namespace": "university_data"},
            )
            summary["university_data"] = res.get("chunks", 0)
    except Exception as e:
        logger.warning("university_data seed failed: %s", e)

    return summary


# ─────────────────────────────────────────────────────────────────────────
# CLI entry point
# ─────────────────────────────────────────────────────────────────────────

async def _amain():
    import asyncio
    from db import db
    res = await seed_hive_rag(db)
    print("Hive RAG seed result:", res)


if __name__ == "__main__":
    import asyncio
    asyncio.run(_amain())
