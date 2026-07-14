"""Global Blogs Aggregator Agent.

This script aggregates global immigration and travel blogs across various countries.
It uses LLM to generate high-quality blogs for specific categories: F1, H1B, O1, EB1, Business, Travel.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any
import json
import os
import uuid

from db import db, global_blogs_col
from ai_marketplace import AIMarketplace
from vector_store import upsert_documents

logger = logging.getLogger("wehive.blog_aggregator")

TARGET_COUNTRIES = [
    "India", "USA", "United Kingdom", "Canada", "Australia", 
    "Germany", "France", "Japan", "Brazil", "UAE"
]

CATEGORIES = ["F1", "H1B", "O1", "EB1", "Business", "Travel"]

def _parse_agent_response(response_text: str) -> List[Dict[str, Any]]:
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

async def fetch_blogs_for_country(marketplace: AIMarketplace, country: str) -> List[Dict[str, Any]]:
    """LLM generation for blog articles."""
    system_prompt = "You are an expert immigration and travel writer. Always respond with valid JSON only."
    user_prompt = f"""
    Please write 2 engaging blog posts or news summaries regarding {country}.
    You MUST categorize each post into exactly ONE of these categories: F1, H1B, O1, EB1, Business, Travel.
    Format the output strictly as a JSON array of objects with the following keys:
    - "title": string
    - "description": string (A full paragraph of content, at least 3 sentences)
    - "readTime": string (e.g., "5 min read")
    - "category": string (must be one of: F1, H1B, O1, EB1, Business, Travel)
    - "imageUrl": string (Use a generic placeholder like "https://images.unsplash.com/photo-1488085061387-4b4d2b2a5a5a")
    - "author_name": string (Mock author name)
    - "author_initials": string (Mock initials)
    
    Return ONLY the JSON array.
    """
    
    provider, pid = await marketplace.get_active_provider("system")
    if not provider:
        logger.error("No LLM provider available for blog generation")
        return []
    
    response = await provider.chat(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        max_tokens=2000
    )
    
    return _parse_agent_response(response or "")

async def run_aggregator():
    """Main task that runs every 24 hours."""
    logger.info("Starting Global Blogs Aggregator automated loop...")
    marketplace = AIMarketplace()
    
    total_added = 0
    total_skipped = 0
    vector_ids = []
    vector_docs = []
    vector_metas = []
    
    for country in TARGET_COUNTRIES:
        country_id = country.lower().replace(" ", "-")
        logger.info(f"Generating blogs for {country}...")
        try:
            blogs = await fetch_blogs_for_country(marketplace, country)
        except Exception as e:
            logger.error(f"Blog generation failed for {country}: {e}")
            continue
        
        for blog in blogs:
            title = blog.get("title")
            category = blog.get("category", "Travel")
            
            existing = await global_blogs_col.find_one({
                "title": title,
                "country_id": country_id,
            })
            if existing:
                total_skipped += 1
                continue
            
            doc = {
                "title": title,
                "country_id": country_id,
                "description": blog.get("description"),
                "readTime": blog.get("readTime", "5 min read"),
                "category": category,
                "imageUrl": blog.get("imageUrl"),
                "author": {
                    "name": blog.get("author_name", "AI Writer"),
                    "initials": blog.get("author_initials", "AI")
                },
                "status": "pending",
                "created_at": datetime.utcnow()
            }
            res = await global_blogs_col.insert_one(doc)
            total_added += 1
            
            doc_id = str(res.inserted_id)
            vector_ids.append(doc_id)
            vector_docs.append(f"{title} {blog.get('description', '')}")
            vector_metas.append({
                "type": "blog",
                "country_id": country_id,
                "category": category
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
            logger.info(f"Ingested {len(vector_ids)} blogs into Vector DB.")
        except Exception as e:
            logger.error(f"Failed to ingest blogs into vector DB: {e}")

    logger.info(f"Aggregator finished. Inserted {total_added} pending blogs, skipped {total_skipped} duplicates.")

async def run_auto_approval():
    """Fallback task that runs periodically to auto-approve safe blogs older than 2 hours."""
    logger.info("Running auto-approval check for blogs...")
    two_hours_ago = datetime.utcnow() - timedelta(hours=2)
    
    query = {
        "status": "pending",
        "created_at": {"$lt": two_hours_ago}
    }
    
    update = {
        "$set": {"status": "approved"}
    }
    
    result = await global_blogs_col.update_many(query, update)
    if result.modified_count > 0:
        logger.info(f"Auto-approved {result.modified_count} safe blogs.")
    else:
        logger.info("No safe pending blogs ready for auto-approval.")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    async def main():
        await run_aggregator()
        await run_auto_approval()
        
    asyncio.run(main())
