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
        'subtitle': 'Explore visa packages for top summer destinations with up to 40% off',
        'description': 'Explore visa packages for top summer destinations — Maldives, Thailand, Singapore & more.',
        'cta_label': 'Explore Deals',
        'cta_url': '/visa/sg',
        'image_url': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
        'accent_color': '#f59e0b',
        'tag': 'tourist',
        'sort_order': 1,
        'is_published': True,
        'countries': [
            {'name': 'Greece', 'flag': '🇬🇷', 'price': '₹8,999'},
            {'name': 'Spain', 'flag': '🇪🇸', 'price': '₹9,499'},
            {'name': 'Italy', 'flag': '🇮🇹', 'price': '₹9,999'},
            {'name': 'Thailand', 'flag': '🇹🇭', 'price': '₹4,999'},
            {'name': 'Portugal', 'flag': '🇵🇹', 'price': '₹7,999'},
        ],
        'perks': [
            {'icon': 'Timer', 'text': 'Express 3-5 days'},
            {'icon': 'ShieldCheck', 'text': 'Free insurance'},
            {'icon': 'Zap', 'text': 'Multi-city option'},
        ],
        'rating': 4.8,
        'reviews': 2847,
        'bookings': '1.2K+',
        'priceFrom': '₹4,999',
        'processing': '3-5 days',
        'validUntil': '2026-08-31',
        'daysLeft': 82,
        'highlight': True,
        'testimonial': '"Best summer deal I got!"',
    },
    {
        'title': 'Business Travel Made Easy',
        'subtitle': 'Fast-track visas for frequent travellers with priority processing',
        'description': 'Fast-track visas for frequent travellers — US, UK, Schengen & UAE business visas.',
        'cta_label': 'Get Business Visa',
        'cta_url': '/visa/us',
        'image_url': 'https://images.unsplash.com/photo-1474771011934-8fa87b8e4f5c?auto=format&fit=crop&w=1200&q=80',
        'accent_color': '#3b82f6',
        'tag': 'business',
        'sort_order': 2,
        'is_published': True,
        'countries': [
            {'name': 'USA', 'flag': '🇺🇸', 'price': '₹15,999'},
            {'name': 'UK', 'flag': '🇬🇧', 'price': '₹12,499'},
            {'name': 'UAE', 'flag': '🇦🇪', 'price': '₹6,999'},
            {'name': 'Singapore', 'flag': '🇸🇬', 'price': '₹4,999'},
            {'name': 'Germany', 'flag': '🇩🇪', 'price': '₹11,999'},
        ],
        'perks': [
            {'icon': 'Clock', 'text': '3-day processing'},
            {'icon': 'CheckCircle2', 'text': 'Multiple entry'},
            {'icon': 'Users', 'text': 'Dedicated support'},
        ],
        'rating': 4.9,
        'reviews': 1923,
        'bookings': '890+',
        'priceFrom': '₹4,999',
        'processing': '2-3 days',
        'validUntil': 'Ongoing',
        'daysLeft': None,
        'highlight': False,
        'testimonial': '"Express business visa!"',
    },
    {
        'title': 'Student Visa Offers',
        'subtitle': 'Study abroad with dedicated visa support and scholarship benefits',
        'description': 'Study abroad with dedicated visa support — Canada, UK, Australia & USA student visas.',
        'cta_label': 'View Student Visa',
        'cta_url': '/visa/ca',
        'image_url': 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80',
        'accent_color': '#22c55e',
        'tag': 'student',
        'sort_order': 3,
        'is_published': True,
        'countries': [
            {'name': 'USA', 'flag': '🇺🇸', 'price': '₹12,999'},
            {'name': 'Canada', 'flag': '🇨🇦', 'price': '₹10,999'},
            {'name': 'UK', 'flag': '🇬🇧', 'price': '₹11,499'},
            {'name': 'Australia', 'flag': '🇦🇺', 'price': '₹13,999'},
            {'name': 'Germany', 'flag': '🇩🇪', 'price': '₹7,999'},
        ],
        'perks': [
            {'icon': 'Percent', 'text': 'Low processing fees'},
            {'icon': 'Users', 'text': 'Parent accommodation'},
            {'icon': 'Sparkles', 'text': 'Part-time work guide'},
        ],
        'rating': 4.7,
        'reviews': 3102,
        'bookings': '2.1K+',
        'priceFrom': '₹7,999',
        'processing': '5-10 days',
        'validUntil': '2026-09-30',
        'daysLeft': 112,
        'highlight': False,
        'testimonial': '"Perfect for students!"',
    },
    {
        'title': 'Holiday Visa Deals',
        'subtitle': 'Plan your perfect getaway with visa-on-arrival destinations',
        'description': 'Plan your perfect getaway with visa-on-arrival destinations across Asia & Caribbean.',
        'cta_label': 'Browse Holidays',
        'cta_url': '/holiday/th',
        'image_url': 'https://images.unsplash.com/photo-1559599746-c76dc1a20e2f?auto=format&fit=crop&w=1200&q=80',
        'accent_color': '#ec4899',
        'tag': 'holiday',
        'sort_order': 4,
        'is_published': True,
        'countries': [
            {'name': 'Maldives', 'flag': '🇲🇻', 'price': '₹5,999'},
            {'name': 'Bali', 'flag': '🇮🇩', 'price': '₹3,999'},
            {'name': 'Dubai', 'flag': '🇦🇪', 'price': '₹4,999'},
            {'name': 'Seychelles', 'flag': '🇸🇨', 'price': '₹8,999'},
            {'name': 'Mauritius', 'flag': '🇲🇺', 'price': '₹7,499'},
        ],
        'perks': [
            {'icon': 'MapPin', 'text': 'Visa on arrival'},
            {'icon': 'Eye', 'text': 'Airport pickup'},
            {'icon': 'Sparkles', 'text': 'Hotel deals'},
        ],
        'rating': 4.9,
        'reviews': 4521,
        'bookings': '3.5K+',
        'priceFrom': '₹3,999',
        'processing': '1-3 days',
        'validUntil': '2026-12-31',
        'daysLeft': 204,
        'highlight': False,
        'testimonial': '"Hassle-free holiday!"',
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
            'countries': ev.get('countries', []),
            'perks': ev.get('perks', []),
            'rating': ev.get('rating', 4.8),
            'reviews': ev.get('reviews', 0),
            'bookings': ev.get('bookings', '0+'),
            'priceFrom': ev.get('priceFrom', '₹4,999'),
            'processing': ev.get('processing', '3-5 days'),
            'validUntil': ev.get('validUntil', 'Ongoing'),
            'daysLeft': ev.get('daysLeft'),
            'highlight': ev.get('highlight', False),
            'testimonial': ev.get('testimonial'),
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