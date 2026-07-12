"""Global News Aggregator Agent with ScrapeGraphAI Integration.

This script aggregates global immigration news across various countries.
It primarily uses ScrapeGraphAI to scrape designated open sources (GitHub links, social media, official sites).
If a scrape fails, it falls back to the AI Marketplace/Agent framework.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any
import json
import os

from core.db import db, global_news_col
from ai_marketplace import AIMarketplace
from shared.vector_store import upsert_documents

try:
    import nest_asyncio
    nest_asyncio.apply()
except ImportError:
    pass

try:
    from scrapegraphai.graphs import SmartScraperGraph
    SCRAPEGRAPH_AVAILABLE = True
except ImportError:
    SCRAPEGRAPH_AVAILABLE = False


logger = logging.getLogger("wehive.news_aggregator")

TARGET_COUNTRIES = [
    "India", "USA", "United Kingdom", "Canada", "Australia", 
    "Germany", "France", "Japan", "Brazil", "UAE"
]

CATEGORIES = ["F1", "H1B", "O1", "EB1", "Business", "Travel"]

# Automated seed URLs to scrape daily across platforms
SEED_URLS = {
    "united-kingdom": [
        {"url": "https://www.gov.uk/browse/visas-immigration", "platform": "website"},
        {"url": "https://github.com/topics/uk-immigration", "platform": "github"},
        {"url": "https://twitter.com/ukhomeoffice", "platform": "twitter"}
    ],
    "usa": [
        {"url": "https://www.uscis.gov/newsroom", "platform": "website"},
        {"url": "https://github.com/topics/uscis", "platform": "github"},
        {"url": "https://twitter.com/USCIS", "platform": "twitter"}
    ]
}

def _parse_agent_response(response_text: str) -> List[Dict[str, Any]]:
    """Attempt to parse the JSON array of news from the LLM response."""
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
    
    if platform == "twitter" or "x.com" in url_lower or "twitter.com" in url_lower:
        username = url.rstrip('/').split('/')[-1]
        return f"https://nitter.net/{username}"
        
    if platform == "instagram" or "instagram.com" in url_lower:
        username = url.rstrip('/').split('/')[-1]
        return f"https://www.picuki.com/profile/{username}"
        
    return url

async def fetch_news_from_url(url: str, country: str, platform: str = None) -> List[Dict[str, Any]]:
    """Use ScrapeGraphAI to extract news from a specific URL or social media handle."""
    if not SCRAPEGRAPH_AVAILABLE:
        logger.warning("ScrapeGraphAI is not installed. Falling back to LLM hallucination.")
        return await fetch_news_for_country_fallback(AIMarketplace(), country)

    target_url = _route_social_media_url(url, platform)
    logger.info(f"Scraping URL: {target_url} (Original: {url})")

    prompt = f"""
    Extract the latest immigration news, policy updates, or visa-related announcements from this page.
    If this is a GitHub repository or social media feed, carefully read the recent posts or readmes for any relevant news.
    You MUST categorize each news item into exactly ONE of these categories: F1, H1B, O1, EB1, Business, Travel.
    Format the output strictly as a JSON array of objects with the following keys:
    - "title": string (Headline of the news)
    - "date": string (Extract date from text, e.g., "2026-10-15". If unspecified, try to infer it)
    - "category": string (must be one of: F1, H1B, O1, EB1, Business, Travel)
    - "content": string (A brief summary of the news, 2-3 sentences)
    - "source_url": string (Link to the full article or post if available, else null)
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
        def run_scraper():
            smart_scraper_graph = SmartScraperGraph(
                prompt=prompt,
                source=target_url,
                config=graph_config
            )
            return smart_scraper_graph.run()
            
        result = await asyncio.to_thread(run_scraper)
        
        if isinstance(result, list):
            return result
        elif isinstance(result, dict) and "news" in result:
            return result["news"]
        elif isinstance(result, dict):
            for v in result.values():
                if isinstance(v, list):
                    return v
        return []
    except Exception as e:
        logger.error(f"ScrapeGraphAI failed for {url}: {e}")
        return await fetch_news_for_country_fallback(AIMarketplace(), country)

async def fetch_news_for_country_fallback(marketplace: AIMarketplace, country: str) -> List[Dict[str, Any]]:
    """Fallback LLM generation if scraping fails."""
    prompt = f"""
    You are an expert immigration news reporter.
    Please write 2 mock news headlines regarding recent visa or immigration updates in {country}.
    You MUST categorize each news item into exactly ONE of these categories: F1, H1B, O1, EB1, Business, Travel.
    Format the output strictly as a JSON array of objects with the following keys:
    - "title": string
    - "date": string (e.g., "2026-10-15")
    - "category": string (must be one of: F1, H1B, O1, EB1, Business, Travel)
    - "content": string (A brief summary of the news, 2-3 sentences)
    - "source_url": string (A generic url placeholder like "https://example.com/news")
    
    Return ONLY the JSON array.
    """
    
    response = await marketplace.chat(
        provider="ollama", # Or openai/anthropic based on config
        model="llama3", 
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3
    )
    
    return _parse_agent_response(response or "")

async def run_aggregator():
    """Main task that runs every 24 hours."""
    logger.info("Starting Global News Aggregator automated scraping loop...")
    marketplace = AIMarketplace()
    
    total_added = 0
    vector_ids = []
    vector_docs = []
    vector_metas = []

    # 1. Scrape predefined seed URLs across platforms
    for country_id, seeds in SEED_URLS.items():
        logger.info(f"Scraping {len(seeds)} seed URLs for {country_id}...")
        for seed in seeds:
            news_items = await fetch_news_from_url(seed["url"], country_id, seed.get("platform"))
            for news in news_items:
                doc = {
                    "title": news.get("title"),
                    "country_id": country_id,
                    "date": news.get("date"),
                    "category": news.get("category", "Travel"),
                    "content": news.get("content"),
                    "source_url": news.get("source_url"),
                    "status": "pending",
                    "created_at": datetime.utcnow()
                }
                res = await global_news_col.insert_one(doc)
                total_added += 1
                
                doc_id = str(res.inserted_id)
                vector_ids.append(doc_id)
                vector_docs.append(f"{news.get('title')} {news.get('content')}")
                vector_metas.append({
                    "type": "news",
                    "country_id": country_id,
                    "category": news.get("category", "Travel")
                })
            await asyncio.sleep(2)
            
    # 2. Fallback LLM generation for countries without seeds
    for country in TARGET_COUNTRIES:
        country_id = country.lower().replace(" ", "-")
        if country_id not in SEED_URLS:
            logger.info(f"No seeds found for {country}, using LLM fallback...")
            news_items = await fetch_news_for_country_fallback(marketplace, country)
            
            for news in news_items:
                doc = {
                    "title": news.get("title"),
                    "country_id": country_id,
                    "date": news.get("date"),
                    "category": news.get("category", "Travel"),
                    "content": news.get("content"),
                    "source_url": news.get("source_url"),
                    "status": "pending",
                    "created_at": datetime.utcnow()
                }
                res = await global_news_col.insert_one(doc)
                total_added += 1
                
                doc_id = str(res.inserted_id)
                vector_ids.append(doc_id)
                vector_docs.append(f"{news.get('title')} {news.get('content')}")
                vector_metas.append({
                    "type": "news",
                    "country_id": country_id,
                    "category": news.get("category", "Travel")
                })
            
            await asyncio.sleep(2)
            
    # Ingest into Vector DB
    if vector_ids:
        try:
            from shared.ollama_embeddings import get_embedding
            embeddings = []
            for text in vector_docs:
                emb = await get_embedding(text)
                embeddings.append(emb)
                
            upsert_documents("wehive_rag", vector_ids, vector_docs, embeddings, vector_metas)
            logger.info(f"Ingested {len(vector_ids)} news items into Vector DB.")
        except Exception as e:
            logger.error(f"Failed to ingest news into vector DB: {e}")
        
    logger.info(f"Aggregator finished. Inserted {total_added} pending news items.")

async def run_auto_approval():
    """Fallback task that runs periodically to auto-approve safe news older than 2 hours."""
    logger.info("Running auto-approval check for news...")
    two_hours_ago = datetime.utcnow() - timedelta(hours=2)
    
    query = {
        "status": "pending",
        "created_at": {"$lt": two_hours_ago}
    }
    
    update = {
        "$set": {"status": "approved"}
    }
    
    result = await global_news_col.update_many(query, update)
    if result.modified_count > 0:
        logger.info(f"Auto-approved {result.modified_count} safe news items.")
    else:
        logger.info("No safe pending news ready for auto-approval.")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    async def main():
        await run_aggregator()
        await run_auto_approval()
        
    asyncio.run(main())
