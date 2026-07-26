"""Global Events Aggregator Agent with ScrapeGraphAI Integration.

This script aggregates global events across various countries.
It primarily uses ScrapeGraphAI to scrape designated ticketing URLs or fest sites.
If a scrape fails, it falls back to the AI Marketplace/Agent framework.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any
import json
import os
import httpx

from db import db, global_events_col
from ai_marketplace import AIMarketplace
from vector_store import upsert_documents

try:
    import nest_asyncio
    nest_asyncio.apply()
except Exception:
    pass

try:
    from scrapegraphai.graphs import SmartScraperGraph
    SCRAPEGRAPH_AVAILABLE = True
except ImportError:
    SCRAPEGRAPH_AVAILABLE = False


logger = logging.getLogger("wehive.event_aggregator")

# Mock list of target countries for the MVP
TARGET_COUNTRIES = [
    "India", "USA", "United Kingdom", "Canada", "Australia", 
    "Germany", "France", "Japan", "Brazil", "UAE"
]

# Automated seed URLs to scrape daily across platforms
SEED_URLS = {
    "united-kingdom": [
        {"url": "https://www.eventbrite.co.uk/d/united-kingdom/all-events/", "platform": "website"},
        {"url": "https://twitter.com/LondonEvents", "platform": "twitter"},
        {"url": "https://instagram.com/timeoutlondon", "platform": "instagram"}
    ],
    "usa": [
        {"url": "https://www.eventbrite.com/d/ny--new-york/all-events/", "platform": "website"},
        {"url": "https://twitter.com/nycgo", "platform": "twitter"},
        {"url": "https://threads.net/@nyc", "platform": "threads"}
    ]
}

def _parse_agent_response(response_text: str) -> List[Dict[str, Any]]:
    """Attempt to parse the JSON array of events from the LLM response."""
    if not isinstance(response_text, str):
        return []
    try:
        start = response_text.find('[')
        end = response_text.rfind(']')
        if start != -1 and end != -1:
            json_str = response_text[start:end+1]
            return json.loads(json_str)
        return []
    except Exception as e:
        logger.error(f"Failed to parse agent response: {e}")
        return []

def _route_social_media_url(url: str, platform: str = None) -> str:
    """Rewrite social media URLs to use public proxy viewers to avoid login walls."""
    if not url:
        return url
        
    url_lower = url.lower()
    
    # Force platform routing if provided, otherwise infer from URL
    if platform == "twitter" or "x.com" in url_lower or "twitter.com" in url_lower:
        # Nitter proxy
        username = url.rstrip('/').split('/')[-1]
        return f"https://nitter.net/{username}"
        
    if platform == "instagram" or "instagram.com" in url_lower:
        # Picuki proxy
        username = url.rstrip('/').split('/')[-1]
        return f"https://www.picuki.com/profile/{username}"
        
    return url

async def _openai_available() -> bool:
    """Quick check if OpenAI API is reachable (not rate-limited/quota-exceeded)."""
    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not key:
        return False
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json={"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "hi"}], "max_tokens": 1},
            )
            return r.status_code == 200
    except Exception:
        return False

async def fetch_events_from_url(url: str, country: str, platform: str = None) -> List[Dict[str, Any]]:
    """Use ScrapeGraphAI to extract events from a specific URL or social media handle."""
    if not SCRAPEGRAPH_AVAILABLE:
        logger.warning("ScrapeGraphAI is not installed. Falling back to LLM hallucination.")
        return await fetch_events_for_country_fallback(AIMarketplace(), country)

    if not await _openai_available():
        logger.warning("OpenAI unavailable (quota/rate-limit). Skipping ScrapeGraphAI, using LLM fallback.")
        return await fetch_events_for_country_fallback(AIMarketplace(), country)

    # Route URL through proxy if it's social media
    target_url = _route_social_media_url(url, platform)
    logger.info(f"Scraping URL: {target_url} (Original: {url})")

    prompt = f"""
    Extract all upcoming events, festivals, conferences, or gatherings from this page.
    If this is a social media feed, carefully read the recent posts and bios for any event announcements.
    Format the output strictly as a JSON array of objects with the following keys:
    - "name": string (Title of the event)
    - "date": string (Extract date from text, e.g., "2026-10-15". If unspecified, try to infer it)
    - "category": string (e.g., "Music", "Tech", "Culture", "Meetup")
    - "image_url": string (extract main image from post or page if available, else null)
    - "is_high_risk": boolean (True if it's a massive gathering >50k people or politically sensitive, False otherwise)
    """

    graph_config = {
        "llm": {
            "api_key": os.environ.get("OPENAI_API_KEY", "mock-key"),
            "model": "openai/gpt-4o-mini",
        },
        "verbose": True,
        "headless": True,
    }

    try:
        # SmartScraperGraph requires synchronous execution; running in a thread
        def run_scraper():
            smart_scraper_graph = SmartScraperGraph(
                prompt=prompt,
                source=target_url,
                config=graph_config
            )
            return smart_scraper_graph.run()
            
        result = await asyncio.to_thread(run_scraper)
        
        # Result should be a dict if ScrapeGraphAI correctly parsed it.
        # Ensure it conforms to our list.
        if isinstance(result, list):
            return result
        elif isinstance(result, dict) and "events" in result:
            return result["events"]
        elif isinstance(result, dict):
            # Try to find any list in the dict
            for v in result.values():
                if isinstance(v, list):
                    return v
        return []
    except Exception as e:
        logger.error(f"ScrapeGraphAI failed for {url}: {e}")
        return await fetch_events_for_country_fallback(AIMarketplace(), country)

async def fetch_events_for_country_fallback(marketplace: AIMarketplace, country: str) -> List[Dict[str, Any]]:
    """Fallback LLM generation if scraping fails or isn't triggered via URL."""
    system_prompt = "You are an expert global event aggregator. Always respond with valid JSON only."
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    user_prompt = f"""
    Please list 3 major upcoming events, festivals, or conferences in {country} scheduled AFTER today's date ({today_str}).
    All event dates MUST be future dates formatted strictly as YYYY-MM-DD (e.g. between {today_str} and 2027-12-31).
    Format the output strictly as a JSON array of objects with the following keys:
    - "name": string
    - "date": string (YYYY-MM-DD format, must be >= {today_str})
    - "category": string (e.g., "Music", "Tech", "Culture")
    - "image_url": string (Use a generic placeholder like "https://images.unsplash.com/photo-1506157786151-b8491531f063")
    - "is_high_risk": boolean (True if it's a massive gathering >50k people or politically sensitive, False otherwise)
    
    Return ONLY the JSON array.
    """
    
    provider, pid = await marketplace.get_active_provider("system")
    if not provider:
        logger.error("No LLM provider available for event fallback")
        return []
    
    response = await provider.chat(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        max_tokens=2000
    )
    
    return _parse_agent_response(response or "")

async def run_aggregator():
    """Main task that runs every 24 hours."""
    logger.info("Starting Global Event Aggregator automated scraping loop...")
    marketplace = AIMarketplace()
    
    total_added = 0
    total_skipped = 0
    vector_ids = []
    vector_docs = []
    vector_metas = []

    # 1. Scrape predefined seed URLs across platforms
    for country_id, seeds in SEED_URLS.items():
        logger.info(f"Scraping {len(seeds)} seed URLs for {country_id}...")
        for seed in seeds:
            try:
                events = await fetch_events_from_url(seed["url"], country_id, seed.get("platform"))
            except Exception as e:
                logger.error(f"Scrape failed for {seed['url']}: {e}")
                continue
            for evt in events:
                name = evt.get("name")
                category = evt.get("category")
                date = evt.get("date")
                
                existing = await global_events_col.find_one({
                    "name": name,
                    "country_id": country_id,
                    "date": date,
                })
                if existing:
                    total_skipped += 1
                    continue
                
                doc = {
                    "name": name,
                    "country_id": country_id,
                    "date": date,
                    "category": category,
                    "image_url": evt.get("image_url"),
                    "status": "pending",
                    "is_high_risk": evt.get("is_high_risk", False),
                    "created_at": datetime.utcnow()
                }
                res = await global_events_col.insert_one(doc)
                total_added += 1
                
                doc_id = str(res.inserted_id)
                vector_ids.append(doc_id)
                vector_docs.append(f"{name} {category} {date}")
                vector_metas.append({
                    "type": "event",
                    "country_id": country_id,
                    "category": category,
                    "is_high_risk": evt.get("is_high_risk", False)
                })
            await asyncio.sleep(2)
            
    # 2. Fallback LLM generation for countries without seeds
    for country in TARGET_COUNTRIES:
        country_id = country.lower().replace(" ", "-")
        if country_id not in SEED_URLS:
            logger.info(f"No seeds found for {country}, using LLM fallback...")
            try:
                events = await fetch_events_for_country_fallback(marketplace, country)
            except Exception as e:
                logger.error(f"LLM fallback failed for {country}: {e}")
                continue
            
            for evt in events:
                name = evt.get("name")
                category = evt.get("category")
                date = evt.get("date")
                
                existing = await global_events_col.find_one({
                    "name": name,
                    "country_id": country_id,
                    "date": date,
                })
                if existing:
                    total_skipped += 1
                    continue
                
                doc = {
                    "name": name,
                    "country_id": country_id,
                    "date": date,
                    "category": category,
                    "image_url": evt.get("image_url"),
                    "status": "pending",
                    "is_high_risk": evt.get("is_high_risk", False),
                    "created_at": datetime.utcnow()
                }
                res = await global_events_col.insert_one(doc)
                total_added += 1
                
                doc_id = str(res.inserted_id)
                vector_ids.append(doc_id)
                vector_docs.append(f"{name} {category} {date}")
                vector_metas.append({
                    "type": "event",
                    "country_id": country_id,
                    "category": category,
                    "is_high_risk": evt.get("is_high_risk", False)
                })
            
            await asyncio.sleep(2)
        
    if vector_ids:
        try:
            from ollama_embeddings import embed_query
            embeddings = []
            for text in vector_docs:
                emb = await embed_query(text)
                embeddings.append(emb)
            upsert_documents("wehive_rag", vector_ids, vector_docs, embeddings, vector_metas)
            logger.info(f"Ingested {len(vector_ids)} events into Vector DB.")
        except Exception as e:
            logger.error(f"Failed to ingest events into vector DB: {e}")
            
    logger.info(f"Aggregator finished. Inserted {total_added} pending events, skipped {total_skipped} duplicates.")

async def run_auto_approval():
    """Fallback task that runs periodically to auto-approve safe events."""
    logger.info("Running auto-approval check...")
    
    query = {
        "status": "pending",
        "is_high_risk": False,
    }
    
    update = {
        "$set": {"status": "approved"}
    }
    
    result = await global_events_col.update_many(query, update)
    if result.modified_count > 0:
        logger.info(f"Auto-approved {result.modified_count} safe events.")
    else:
        logger.info("No safe pending events ready for auto-approval.")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    async def main():
        await run_aggregator()
        await run_auto_approval()
        
    asyncio.run(main())
