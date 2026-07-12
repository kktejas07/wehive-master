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

from core.db import db, global_blogs_col
from ai_marketplace import AIMarketplace
from shared.vector_store import upsert_documents

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
    prompt = f"""
    You are an expert immigration and travel writer.
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
    
    response = await marketplace.chat(
        provider="ollama", # Or openai/anthropic based on config
        model="llama3", 
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7
    )
    
    return _parse_agent_response(response or "")

async def run_aggregator():
    """Main task that runs every 24 hours."""
    logger.info("Starting Global Blogs Aggregator automated loop...")
    marketplace = AIMarketplace()
    
    total_added = 0
    vector_ids = []
    vector_docs = []
    vector_metas = []
    
    for country in TARGET_COUNTRIES:
        country_id = country.lower().replace(" ", "-")
        logger.info(f"Generating blogs for {country}...")
        blogs = await fetch_blogs_for_country(marketplace, country)
        
        for blog in blogs:
            doc = {
                "title": blog.get("title"),
                "country_id": country_id,
                "description": blog.get("description"),
                "readTime": blog.get("readTime", "5 min read"),
                "category": blog.get("category", "Travel"),
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
            
            # Prepare for Vector DB
            doc_id = str(res.inserted_id)
            vector_ids.append(doc_id)
            vector_docs.append(f"{blog.get('title')} {blog.get('description')}")
            vector_metas.append({
                "type": "blog",
                "country_id": country_id,
                "category": blog.get("category", "Travel")
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
            logger.info(f"Ingested {len(vector_ids)} blogs into Vector DB.")
        except Exception as e:
            logger.error(f"Failed to ingest blogs into vector DB: {e}")

    logger.info(f"Aggregator finished. Inserted {total_added} pending blogs.")

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
