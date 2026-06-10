"""Seed promotional events / featured offers into MongoDB `events` collection.

Run locally:
    python -m seed_events
"""

import asyncio
import os
import sys
from pathlib import Path
from datetime import datetime, timedelta
import uuid

from dotenv import load_dotenv
ROOT = Path(__file__).parent
load_dotenv(ROOT / '.env')

from db import db

EVENTS = [
    {
        'title': 'Summer Getaway Deals',
        'subtitle': 'Explore visa packages for top summer destinations — Maldives, Thailand, Singapore & more.',
        'cta_label': 'Explore Deals',
        'cta_url': '/visa/sg',
        'image_url': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
        'accent_color': '#0a2c8a',
        'tag': 'holiday',
        'sort_order': 1,
        'is_published': True,
    },
    {
        'title': 'Business Travel Made Easy',
        'subtitle': 'Fast-track visas for frequent travellers — US, UK, Schengen & UAE business visas.',
        'cta_label': 'Get Business Visa',
        'cta_url': '/visa/us',
        'image_url': 'https://images.unsplash.com/photo-1474771011934-8fa87b8e4f5c?auto=format&fit=crop&w=1200&q=80',
        'accent_color': '#e1212c',
        'tag': 'business',
        'sort_order': 2,
        'is_published': True,
    },
    {
        'title': 'Student Visa Offers',
        'subtitle': 'Study abroad with dedicated visa support — Canada, UK, Australia & USA student visas.',
        'cta_label': 'View Student Visa',
        'cta_url': '/visa/ca',
        'image_url': 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80',
        'accent_color': '#22c55e',
        'tag': 'student',
        'sort_order': 3,
        'is_published': True,
    },
    {
        'title': 'Holiday Visa Deals',
        'subtitle': 'Plan your perfect getaway with visa-on-arrival destinations across Asia & Caribbean.',
        'cta_label': 'Browse Holidays',
        'cta_url': '/holiday/th',
        'image_url': 'https://images.unsplash.com/photo-1559599746-c76dc1a20e2f?auto=format&fit=crop&w=1200&q=80',
        'accent_color': '#ec4899',
        'tag': 'holiday',
        'sort_order': 4,
        'is_published': True,
    },
    {
        'title': 'Express Visa Processing',
        'subtitle': 'Get your visa in 48-72 hours — UAE, Singapore, Japan & Qatar express services.',
        'cta_label': 'Book Now',
        'cta_url': '/visa/ae',
        'image_url': 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80',
        'accent_color': '#f59e0b',
        'tag': 'tourist',
        'sort_order': 5,
        'is_published': True,
    },
    {
        'title': 'Schengen Visa Special',
        'subtitle': 'Explore 26 European countries with our streamlined Schengen visa application.',
        'cta_label': 'Apply Now',
        'cta_url': '/visa/fr',
        'image_url': 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1200&q=80',
        'accent_color': '#1e40af',
        'tag': 'tourist',
        'sort_order': 6,
        'is_published': True,
    },
    {
        'title': 'Japan Cherry Blossom Season',
        'subtitle': 'Experience Japan during sakura season — tourist visa packages with guided support.',
        'cta_label': 'Plan Your Trip',
        'cta_url': '/visa/jp',
        'image_url': 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80',
        'accent_color': '#f43f5e',
        'tag': 'tourist',
        'sort_order': 7,
        'is_published': True,
    },
    {
        'title': 'Australia Work & Holiday',
        'subtitle': 'Working holiday visa for young travellers — spot availability and fast processing.',
        'cta_label': 'Check Eligibility',
        'cta_url': '/visa/au',
        'image_url': 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1200&q=80',
        'accent_color': '#10b981',
        'tag': 'work',
        'sort_order': 8,
        'is_published': True,
    },
]


async def seed():
    col = db['events']
    now = datetime.utcnow()
    count = 0

    for ev in EVENTS:
        doc = {
            '_id': str(uuid.uuid4()),
            'title': ev['title'],
            'subtitle': ev.get('subtitle'),
            'description': ev.get('description'),
            'country_id': ev.get('country_id'),
            'visa_type': ev.get('visa_type'),
            'cta_label': ev.get('cta_label', 'Explore'),
            'cta_url': ev.get('cta_url'),
            'image_url': ev.get('image_url'),
            'accent_color': ev.get('accent_color', '#e1212c'),
            'starts_at': ev.get('starts_at'),
            'ends_at': ev.get('ends_at'),
            'is_published': ev.get('is_published', True),
            'sort_order': ev.get('sort_order', 0),
            'tag': ev.get('tag'),
            'created_at': now,
            'updated_at': now,
        }
        await col.update_one(
            {'title': doc['title']},
            {'$set': doc},
            upsert=True
        )
        count += 1

    print(f'[seed_events] Inserted/updated {count} events into `events` collection')
    return count


if __name__ == '__main__':
    asyncio.run(seed())