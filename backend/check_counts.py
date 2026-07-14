import asyncio
from db import global_news_col, global_blogs_col, global_events_col

async def count_live():
    news_count = await global_news_col.count_documents({"status": "approved"})
    blogs_count = await global_blogs_col.count_documents({"status": "approved"})
    events_count = await global_events_col.count_documents({"status": "approved"})
    
    print(f"Live News: {news_count}")
    print(f"Live Blogs: {blogs_count}")
    print(f"Live Events: {events_count}")

asyncio.run(count_live())
