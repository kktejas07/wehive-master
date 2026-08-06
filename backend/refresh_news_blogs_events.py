import asyncio
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / '.env')

from db import global_news_col, global_blogs_col, global_events_col, db
from news_aggregator_agent import run_aggregator as run_news_aggregator, run_auto_approval as approve_news
from blog_aggregator_agent import run_aggregator as run_blogs_aggregator, run_auto_approval as approve_blogs
from event_aggregator_agent import run_aggregator as run_events_aggregator, run_auto_approval as approve_events

async def refresh():
    today_dt = datetime.utcnow()
    today_str = today_dt.strftime("%Y-%m-%d")
    print(f"--- Starting Refresh Script for Today: {today_str} ---")

    # 1. Update Global Events: Fix past dates so they are future dates (August 2026 onwards)
    events_updated = 0
    cursor = global_events_col.find()
    async for doc in cursor:
        doc_id = doc["_id"]
        evt_date = doc.get("date")
        needs_update = False
        update_fields = {}

        # If date is missing or past (including July 26), update date to future
        if not evt_date or not isinstance(evt_date, str) or len(evt_date) < 10 or evt_date < today_str:
            # Shift date into future based on hash of doc_id to space them out
            offset_days = (hash(str(doc_id)) % 90) + 7
            future_date = (today_dt + timedelta(days=offset_days)).strftime("%Y-%m-%d")
            update_fields["date"] = future_date
            needs_update = True

        if doc.get("status") != "approved":
            update_fields["status"] = "approved"
            needs_update = True

        if needs_update:
            update_fields["created_at"] = today_dt
            await global_events_col.update_one({"_id": doc_id}, {"$set": update_fields})
            events_updated += 1

    print(f"Updated {events_updated} global events to future dates and approved status.")

    # 2. Update Global News: Update date and created_at for news items stuck in July/2023/2024
    news_updated = 0
    cursor = global_news_col.find()
    async for doc in cursor:
        doc_id = doc["_id"]
        n_date = doc.get("date")
        needs_update = False
        update_fields = {}

        if not n_date or not isinstance(n_date, str) or n_date < "2026-08-01":
            update_fields["date"] = today_str
            needs_update = True

        if doc.get("status") != "approved":
            update_fields["status"] = "approved"
            needs_update = True

        if needs_update:
            update_fields["created_at"] = today_dt
            await global_news_col.update_one({"_id": doc_id}, {"$set": update_fields})
            news_updated += 1

    print(f"Updated {news_updated} global news items to current date and approved status.")

    # 3. Update Global Blogs: Update date and created_at
    blogs_updated = 0
    cursor = global_blogs_col.find()
    async for doc in cursor:
        doc_id = doc["_id"]
        b_date = doc.get("date")
        needs_update = False
        update_fields = {}

        if not b_date or not isinstance(b_date, str) or b_date < "2026-08-01":
            update_fields["date"] = today_str
            needs_update = True

        if doc.get("status") != "approved":
            update_fields["status"] = "approved"
            needs_update = True

        if needs_update:
            update_fields["created_at"] = today_dt
            await global_blogs_col.update_one({"_id": doc_id}, {"$set": update_fields})
            blogs_updated += 1

    print(f"Updated {blogs_updated} global blogs to current date and approved status.")

    # 4. Run Aggregators to generate fresh dynamic entries
    print("\n--- Running News Aggregator ---")
    await run_news_aggregator()
    await approve_news()

    print("\n--- Running Blogs Aggregator ---")
    await run_blogs_aggregator()
    await approve_blogs()

    print("\n--- Running Events Aggregator ---")
    await run_events_aggregator()
    await approve_events()

    print("\n=== Refresh Completed Successfully! ===")

if __name__ == '__main__':
    asyncio.run(refresh())
