"""Country + visa metadata for We Hive backend.

Each country has multiple visa categories (Tourist, Business, Student, Work)
with per-category fees, validity, processing time and required documents.
This mirrors atlys.com's Indian-passport categorisation.
"""

from typing import List, Dict, Any


# Required-doc presets for reuse
DOCS_BASIC = ['Passport (6mo validity)', 'Passport-size photo']
DOCS_TOURIST = DOCS_BASIC + ['Bank statements (3 months)', 'Confirmed flight & hotel', 'Travel insurance']
DOCS_BUSINESS = DOCS_BASIC + ['Invitation letter', 'Bank statements (6 months)', 'Cover letter from employer', 'Business registration']
DOCS_STUDENT = DOCS_BASIC + ['University admit letter', 'Financial sponsor proof', 'Academic transcripts', 'Standardized test scores']
DOCS_WORK = DOCS_BASIC + ['Job offer letter', 'Employer sponsorship', 'Educational degrees', 'Police clearance']


def _vc(*, name, fees_inr, fees_usd, processing_days, validity, documents, multi_entry=True):
    return {
        'name': name,
        'fees_inr': fees_inr,
        'fees_usd': fees_usd,
        'processing_days': processing_days,
        'validity': validity,
        'documents': documents,
        'multi_entry': multi_entry,
    }


COUNTRIES: List[Dict[str, Any]] = [
    {
        'id': 'us', 'name': 'United States', 'flag': '\U0001F1FA\U0001F1F8',
        'visa_required': True, 'no_visa': False,
        'visa_types': ['Tourist', 'Business', 'Student', 'Work'],
        'categories': {
            'Tourist': _vc(name='B1/B2 Visitor', fees_inr=15400, fees_usd=185, processing_days=42, validity='10 YEARS', documents=DOCS_TOURIST),
            'Business': _vc(name='B1 Business', fees_inr=15400, fees_usd=185, processing_days=42, validity='10 YEARS', documents=DOCS_BUSINESS),
            'Student': _vc(name='F-1 Student', fees_inr=29000, fees_usd=350, processing_days=60, validity='Course duration', documents=DOCS_STUDENT),
            'Work': _vc(name='H-1B / L-1', fees_inr=37800, fees_usd=460, processing_days=120, validity='3 YEARS', documents=DOCS_WORK),
        },
        'fees_usd': 185, 'validity': '10 YEARS',
        'delivery': {'standard_days': 35, 'rush_days': 14, 'same_day': False},
        'holiday_default_days': 10,
        'highlights': ['Highest demand', 'B1/B2 valid 10 years'],
    },
    {
        'id': 'uk', 'name': 'United Kingdom', 'flag': '\U0001F1EC\U0001F1E7',
        'visa_required': True, 'no_visa': False,
        'visa_types': ['Tourist', 'Business', 'Student', 'Work'],
        'categories': {
            'Tourist': _vc(name='Standard Visitor', fees_inr=11400, fees_usd=140, processing_days=15, validity='6 MONTHS', documents=DOCS_TOURIST),
            'Business': _vc(name='Business Visitor', fees_inr=11400, fees_usd=140, processing_days=15, validity='6 MONTHS', documents=DOCS_BUSINESS),
            'Student': _vc(name='Student (Tier 4)', fees_inr=39000, fees_usd=470, processing_days=21, validity='Course duration', documents=DOCS_STUDENT),
            'Work': _vc(name='Skilled Worker', fees_inr=63000, fees_usd=760, processing_days=21, validity='5 YEARS', documents=DOCS_WORK),
        },
        'fees_usd': 140, 'validity': '6 MONTHS',
        'delivery': {'standard_days': 15, 'rush_days': 5, 'same_day': False},
        'holiday_default_days': 7,
        'highlights': ['Online application', 'Biometrics required'],
    },
    {
        'id': 'jp', 'name': 'Japan', 'flag': '\U0001F1EF\U0001F1F5',
        'visa_required': True, 'no_visa': False,
        'visa_types': ['Tourist', 'Business', 'Student'],
        'categories': {
            'Tourist': _vc(name='eVisa Tourist', fees_inr=3700, fees_usd=45, processing_days=7, validity='90 DAYS', documents=DOCS_BASIC),
            'Business': _vc(name='Business eVisa', fees_inr=3700, fees_usd=45, processing_days=7, validity='90 DAYS', documents=DOCS_BUSINESS),
            'Student': _vc(name='Student Visa', fees_inr=22000, fees_usd=265, processing_days=30, validity='Course duration', documents=DOCS_STUDENT),
        },
        'fees_usd': 45, 'validity': '90 DAYS',
        'delivery': {'standard_days': 7, 'rush_days': 3, 'same_day': False},
        'holiday_default_days': 7,
        'highlights': ['eVisa available', 'Cherry blossom season'],
    },
    {
        'id': 'fr', 'name': 'France', 'flag': '\U0001F1EB\U0001F1F7',
        'visa_required': True, 'no_visa': False,
        'visa_types': ['Tourist', 'Business', 'Student', 'Work'],
        'categories': {
            'Tourist': _vc(name='Schengen Short-Stay', fees_inr=7900, fees_usd=95, processing_days=12, validity='90 DAYS', documents=DOCS_TOURIST),
            'Business': _vc(name='Schengen Business', fees_inr=7900, fees_usd=95, processing_days=12, validity='90 DAYS', documents=DOCS_BUSINESS),
            'Student': _vc(name='Long Stay Student', fees_inr=8700, fees_usd=105, processing_days=21, validity='Course duration', documents=DOCS_STUDENT),
            'Work': _vc(name='Talent Passport', fees_inr=20800, fees_usd=250, processing_days=60, validity='4 YEARS', documents=DOCS_WORK),
        },
        'fees_usd': 95, 'validity': '90 DAYS',
        'delivery': {'standard_days': 12, 'rush_days': 5, 'same_day': False},
        'holiday_default_days': 7,
        'highlights': ['Schengen — 26 countries', 'Allows tourism + business'],
    },
    {
        'id': 'sg', 'name': 'Singapore', 'flag': '\U0001F1F8\U0001F1EC',
        'visa_required': True, 'no_visa': False,
        'visa_types': ['Tourist', 'Business'],
        'categories': {
            'Tourist': _vc(name='eVisa', fees_inr=2500, fees_usd=30, processing_days=4, validity='63 DAYS', documents=DOCS_BASIC),
            'Business': _vc(name='Business eVisa', fees_inr=2500, fees_usd=30, processing_days=4, validity='63 DAYS', documents=DOCS_BUSINESS),
        },
        'fees_usd': 30, 'validity': '63 DAYS',
        'delivery': {'standard_days': 4, 'rush_days': 2, 'same_day': True},
        'holiday_default_days': 5,
        'highlights': ['Same-day eVisa', 'No biometrics'],
    },
    {
        'id': 'ae', 'name': 'United Arab Emirates', 'flag': '\U0001F1E6\U0001F1EA',
        'visa_required': True, 'no_visa': False,
        'visa_types': ['Tourist', 'Business'],
        'categories': {
            'Tourist': _vc(name='30-Day eVisa', fees_inr=6700, fees_usd=80, processing_days=3, validity='60 DAYS', documents=DOCS_BASIC),
            'Business': _vc(name='Business eVisa', fees_inr=6700, fees_usd=80, processing_days=3, validity='60 DAYS', documents=DOCS_BUSINESS),
        },
        'fees_usd': 80, 'validity': '60 DAYS',
        'delivery': {'standard_days': 3, 'rush_days': 1, 'same_day': True},
        'holiday_default_days': 5,
        'highlights': ['Same-day available', 'No interview'],
    },
    {
        'id': 'au', 'name': 'Australia', 'flag': '\U0001F1E6\U0001F1FA',
        'visa_required': True, 'no_visa': False,
        'visa_types': ['Tourist', 'Business', 'Student', 'Work'],
        'categories': {
            'Tourist': _vc(name='Visitor (subclass 600)', fees_inr=13300, fees_usd=160, processing_days=9, validity='12 MONTHS', documents=DOCS_TOURIST),
            'Business': _vc(name='Business Visitor', fees_inr=13300, fees_usd=160, processing_days=9, validity='12 MONTHS', documents=DOCS_BUSINESS),
            'Student': _vc(name='Subclass 500', fees_inr=58500, fees_usd=710, processing_days=30, validity='Course duration', documents=DOCS_STUDENT),
            'Work': _vc(name='TSS 482', fees_inr=99000, fees_usd=1200, processing_days=60, validity='4 YEARS', documents=DOCS_WORK),
        },
        'fees_usd': 160, 'validity': '12 MONTHS',
        'delivery': {'standard_days': 9, 'rush_days': 4, 'same_day': False},
        'holiday_default_days': 10,
        'highlights': ['Multi-entry', 'Online lodgement'],
    },
    {
        'id': 'ca', 'name': 'Canada', 'flag': '\U0001F1E8\U0001F1E6',
        'visa_required': True, 'no_visa': False,
        'visa_types': ['Tourist', 'Business', 'Student', 'Work'],
        'categories': {
            'Tourist': _vc(name='Visitor (TRV)', fees_inr=10000, fees_usd=120, processing_days=14, validity='5 YEARS', documents=DOCS_TOURIST),
            'Business': _vc(name='Business Visitor', fees_inr=10000, fees_usd=120, processing_days=14, validity='5 YEARS', documents=DOCS_BUSINESS),
            'Student': _vc(name='Study Permit', fees_inr=12500, fees_usd=150, processing_days=45, validity='Course duration', documents=DOCS_STUDENT),
            'Work': _vc(name='Work Permit', fees_inr=12900, fees_usd=155, processing_days=60, validity='Up to 3 years', documents=DOCS_WORK),
        },
        'fees_usd': 120, 'validity': '5 YEARS',
        'delivery': {'standard_days': 14, 'rush_days': 7, 'same_day': False},
        'holiday_default_days': 8,
        'highlights': ['Multi-entry', 'Biometrics required'],
    },
    {
        'id': 'it', 'name': 'Italy', 'flag': '\U0001F1EE\U0001F1F9',
        'visa_required': True, 'no_visa': False,
        'visa_types': ['Tourist', 'Business', 'Student'],
        'categories': {
            'Tourist': _vc(name='Schengen Short-Stay', fees_inr=7900, fees_usd=95, processing_days=12, validity='90 DAYS', documents=DOCS_TOURIST),
            'Business': _vc(name='Schengen Business', fees_inr=7900, fees_usd=95, processing_days=12, validity='90 DAYS', documents=DOCS_BUSINESS),
            'Student': _vc(name='National Student', fees_inr=4900, fees_usd=60, processing_days=30, validity='Course duration', documents=DOCS_STUDENT),
        },
        'fees_usd': 95, 'validity': '90 DAYS',
        'delivery': {'standard_days': 12, 'rush_days': 5, 'same_day': False},
        'holiday_default_days': 8,
        'highlights': ['Schengen', 'Heritage destination'],
    },
    {
        'id': 'ch', 'name': 'Switzerland', 'flag': '\U0001F1E8\U0001F1ED',
        'visa_required': True, 'no_visa': False,
        'visa_types': ['Tourist', 'Business', 'Student'],
        'categories': {
            'Tourist': _vc(name='Schengen Short-Stay', fees_inr=7900, fees_usd=95, processing_days=12, validity='90 DAYS', documents=DOCS_TOURIST),
            'Business': _vc(name='Schengen Business', fees_inr=7900, fees_usd=95, processing_days=12, validity='90 DAYS', documents=DOCS_BUSINESS),
            'Student': _vc(name='National D-Visa', fees_inr=7900, fees_usd=95, processing_days=60, validity='Course duration', documents=DOCS_STUDENT),
        },
        'fees_usd': 95, 'validity': '90 DAYS',
        'delivery': {'standard_days': 12, 'rush_days': 5, 'same_day': False},
        'holiday_default_days': 7,
        'highlights': ['Alps', 'Schengen'],
    },
    {
        'id': 'th', 'name': 'Thailand', 'flag': '\U0001F1F9\U0001F1ED',
        'visa_required': True, 'no_visa': False,
        'visa_types': ['Tourist', 'Business'],
        'categories': {
            'Tourist': _vc(name='eVisa Tourist', fees_inr=3300, fees_usd=40, processing_days=5, validity='60 DAYS', documents=DOCS_BASIC),
            'Business': _vc(name='Business eVisa', fees_inr=8300, fees_usd=100, processing_days=10, validity='90 DAYS', documents=DOCS_BUSINESS),
        },
        'fees_usd': 40, 'validity': '60 DAYS',
        'delivery': {'standard_days': 5, 'rush_days': 2, 'same_day': True},
        'holiday_default_days': 6,
        'highlights': ['eVisa', 'Beaches & temples'],
    },
    {
        'id': 'de', 'name': 'Germany', 'flag': '\U0001F1E9\U0001F1EA',
        'visa_required': True, 'no_visa': False,
        'visa_types': ['Tourist', 'Business', 'Student', 'Work'],
        'categories': {
            'Tourist': _vc(name='Schengen Short-Stay', fees_inr=7900, fees_usd=95, processing_days=12, validity='90 DAYS', documents=DOCS_TOURIST),
            'Business': _vc(name='Schengen Business', fees_inr=7900, fees_usd=95, processing_days=12, validity='90 DAYS', documents=DOCS_BUSINESS),
            'Student': _vc(name='National Student', fees_inr=6300, fees_usd=75, processing_days=45, validity='Course duration', documents=DOCS_STUDENT),
            'Work': _vc(name='EU Blue Card', fees_inr=12500, fees_usd=150, processing_days=90, validity='4 YEARS', documents=DOCS_WORK),
        },
        'fees_usd': 95, 'validity': '90 DAYS',
        'delivery': {'standard_days': 12, 'rush_days': 5, 'same_day': False},
        'holiday_default_days': 7,
        'highlights': ['Schengen', 'Top student destination'],
    },
    {
        'id': 'np', 'name': 'Nepal', 'flag': '\U0001F1F3\U0001F1F5',
        'visa_required': False, 'no_visa': True,
        'visa_types': ['Tourist'],
        'categories': {
            'Tourist': _vc(name='Visa-Free Entry', fees_inr=0, fees_usd=0, processing_days=0, validity='150 DAYS', documents=['Passport (6mo validity)'], multi_entry=True),
        },
        'fees_usd': 0, 'validity': 'NOT REQUIRED',
        'delivery': {'standard_days': 0, 'rush_days': 0, 'same_day': True},
        'holiday_default_days': 5,
        'highlights': ['Visa-free for Indians', 'Mountains & culture'],
    },
    {
        'id': 'bt', 'name': 'Bhutan', 'flag': '\U0001F1E7\U0001F1F9',
        'visa_required': False, 'no_visa': True,
        'visa_types': ['Tourist'],
        'categories': {
            'Tourist': _vc(name='Permit (entry permit)', fees_inr=0, fees_usd=0, processing_days=0, validity='14 DAYS', documents=['Passport / Voter ID'], multi_entry=False),
        },
        'fees_usd': 0, 'validity': 'NOT REQUIRED',
        'delivery': {'standard_days': 0, 'rush_days': 0, 'same_day': True},
        'holiday_default_days': 6,
        'highlights': ['Permit on arrival', 'SDF applies'],
    },
]


# Holiday plans (rich data) — all 15 countries
HOLIDAY_PLANS: Dict[str, Dict[str, Any]] = {
    'us': {
        'best_time': 'May to October',
        'currency': 'USD',
        'language': 'English',
        'weather': 'Temperate, varies; Summer 25–35°C',
        'attractions': [
            {'id': 'a1', 'name': 'Statue of Liberty', 'city': 'New York'},
            {'id': 'a2', 'name': 'Grand Canyon', 'city': 'Arizona'},
            {'id': 'a3', 'name': 'Times Square', 'city': 'New York'},
            {'id': 'a4', 'name': 'Golden Gate Bridge', 'city': 'San Francisco'},
            {'id': 'a5', 'name': 'Walt Disney World', 'city': 'Orlando'},
        ],
        'itinerary': [
            {'day': 1, 'title': 'Land in NYC', 'desc': 'Check-in, walk Times Square, Brooklyn Bridge sunset.'},
            {'day': 2, 'title': 'Liberty + Wall Street', 'desc': 'Statue of Liberty ferry, Ellis Island, Wall Street.'},
            {'day': 3, 'title': 'Museums', 'desc': 'MoMA, Central Park, Top of the Rock.'},
            {'day': 4, 'title': 'Fly to Las Vegas', 'desc': 'Strip walk, Bellagio fountains, late-night show.'},
            {'day': 5, 'title': 'Grand Canyon', 'desc': 'Day trip to South Rim. Helicopter optional.'},
            {'day': 6, 'title': 'Fly to San Francisco', 'desc': 'Pier 39, Fisherman\'s Wharf, cable car.'},
            {'day': 7, 'title': 'Golden Gate', 'desc': 'Bike across Golden Gate, Alcatraz tour.'},
            {'day': 8, 'title': 'Yosemite day', 'desc': 'Day trip to Yosemite Valley.'},
            {'day': 9, 'title': 'LA + Hollywood', 'desc': 'Walk of Fame, Santa Monica pier.'},
            {'day': 10, 'title': 'Fly home', 'desc': 'Last brunch and depart.'},
        ],
    },
    'uk': {
        'best_time': 'May to September',
        'currency': 'GBP', 'language': 'English',
        'weather': 'Cool & rainy; Summer 18–25°C',
        'attractions': [
            {'id': 'a1', 'name': 'Big Ben & Parliament', 'city': 'London'},
            {'id': 'a2', 'name': 'Tower of London', 'city': 'London'},
            {'id': 'a3', 'name': 'Edinburgh Castle', 'city': 'Edinburgh'},
            {'id': 'a4', 'name': 'Stonehenge', 'city': 'Wiltshire'},
            {'id': 'a5', 'name': 'British Museum', 'city': 'London'},
        ],
        'itinerary': [
            {'day': 1, 'title': 'Arrive London', 'desc': 'Westminster, London Eye, Thames cruise.'},
            {'day': 2, 'title': 'Royal London', 'desc': 'Buckingham Palace, Tower of London, Tower Bridge.'},
            {'day': 3, 'title': 'Museums', 'desc': 'British Museum, National Gallery, West End show.'},
            {'day': 4, 'title': 'Day trip Stonehenge', 'desc': 'Stonehenge, Bath Roman baths.'},
            {'day': 5, 'title': 'Train to Edinburgh', 'desc': 'Royal Mile, Edinburgh Castle.'},
            {'day': 6, 'title': 'Highlands', 'desc': 'Loch Ness day tour, whisky tasting.'},
            {'day': 7, 'title': 'Return London', 'desc': 'Camden, Notting Hill, fly out.'},
        ],
    },
    'jp': {
        'best_time': 'March–April (cherry blossoms) or October–November',
        'currency': 'JPY', 'language': 'Japanese',
        'weather': 'Mild; Spring 12–20°C',
        'attractions': [
            {'id': 'a1', 'name': 'Mount Fuji', 'city': 'Yamanashi'},
            {'id': 'a2', 'name': 'Senso-ji Temple', 'city': 'Tokyo'},
            {'id': 'a3', 'name': 'Fushimi Inari', 'city': 'Kyoto'},
            {'id': 'a4', 'name': 'Shibuya Crossing', 'city': 'Tokyo'},
            {'id': 'a5', 'name': 'Hiroshima Peace Park', 'city': 'Hiroshima'},
        ],
        'itinerary': [
            {'day': 1, 'title': 'Arrive Tokyo', 'desc': 'Shibuya, Shinjuku night walk.'},
            {'day': 2, 'title': 'Old Tokyo', 'desc': 'Asakusa, Senso-ji, Ueno Park.'},
            {'day': 3, 'title': 'Mt Fuji day trip', 'desc': 'Hakone, Lake Kawaguchiko.'},
            {'day': 4, 'title': 'Shinkansen to Kyoto', 'desc': 'Fushimi Inari shrine.'},
            {'day': 5, 'title': 'Kyoto temples', 'desc': 'Kinkaku-ji, Arashiyama bamboo grove.'},
            {'day': 6, 'title': 'Osaka day', 'desc': 'Dotonbori, Osaka Castle, street food.'},
            {'day': 7, 'title': 'Back to Tokyo', 'desc': 'Akihabara, Tokyo Tower.'},
        ],
    },
    'fr': {
        'best_time': 'April to October',
        'currency': 'EUR', 'language': 'French',
        'weather': 'Temperate; Spring 14–20°C',
        'attractions': [
            {'id': 'a1', 'name': 'Eiffel Tower', 'city': 'Paris'},
            {'id': 'a2', 'name': 'Louvre Museum', 'city': 'Paris'},
            {'id': 'a3', 'name': 'Palace of Versailles', 'city': 'Versailles'},
            {'id': 'a4', 'name': 'French Riviera', 'city': 'Nice'},
            {'id': 'a5', 'name': 'Mont Saint-Michel', 'city': 'Normandy'},
        ],
        'itinerary': [
            {'day': 1, 'title': 'Arrive Paris', 'desc': 'Seine cruise, Champs-Élysées.'},
            {'day': 2, 'title': 'Eiffel + Louvre', 'desc': 'Eiffel sunrise, Louvre afternoon.'},
            {'day': 3, 'title': 'Versailles', 'desc': 'Day trip to Versailles.'},
            {'day': 4, 'title': 'Train to Nice', 'desc': 'Promenade des Anglais.'},
            {'day': 5, 'title': 'Monaco day', 'desc': 'Casino, Old Town, Grand Prix circuit.'},
            {'day': 6, 'title': 'Provence', 'desc': 'Lavender fields, wine tasting.'},
            {'day': 7, 'title': 'Return Paris', 'desc': 'Montmartre, Sacré-Cœur.'},
        ],
    },
    'sg': {
        'best_time': 'February to April',
        'currency': 'SGD', 'language': 'English / Mandarin / Malay',
        'weather': 'Tropical; 26–32°C year-round',
        'attractions': [
            {'id': 'a1', 'name': 'Gardens by the Bay', 'city': 'Marina Bay'},
            {'id': 'a2', 'name': 'Marina Bay Sands', 'city': 'Marina Bay'},
            {'id': 'a3', 'name': 'Sentosa Island', 'city': 'Sentosa'},
            {'id': 'a4', 'name': 'Universal Studios', 'city': 'Sentosa'},
            {'id': 'a5', 'name': 'Hawker Centres', 'city': 'Chinatown'},
        ],
        'itinerary': [
            {'day': 1, 'title': 'Arrive Singapore', 'desc': 'Marina Bay walk, Merlion park.'},
            {'day': 2, 'title': 'Gardens & Sands', 'desc': 'Gardens by the Bay, Sands Skypark.'},
            {'day': 3, 'title': 'Sentosa', 'desc': 'Universal Studios, S.E.A. Aquarium.'},
            {'day': 4, 'title': 'Cultural districts', 'desc': 'Chinatown, Little India, Arab Street.'},
            {'day': 5, 'title': 'Depart', 'desc': 'Jewel Changi, fly out.'},
        ],
    },
    'ae': {
        'best_time': 'November to March',
        'currency': 'AED', 'language': 'Arabic / English',
        'weather': 'Desert; Winter 18–28°C, Summer 35–45°C',
        'attractions': [
            {'id': 'a1', 'name': 'Burj Khalifa', 'city': 'Dubai'},
            {'id': 'a2', 'name': 'Palm Jumeirah', 'city': 'Dubai'},
            {'id': 'a3', 'name': 'Sheikh Zayed Mosque', 'city': 'Abu Dhabi'},
            {'id': 'a4', 'name': 'Desert Safari', 'city': 'Dubai'},
            {'id': 'a5', 'name': 'Dubai Mall & Fountain', 'city': 'Dubai'},
        ],
        'itinerary': [
            {'day': 1, 'title': 'Arrive Dubai', 'desc': 'Dubai Marina walk, JBR Beach.'},
            {'day': 2, 'title': 'Burj + Mall', 'desc': 'Burj Khalifa observation, Dubai Mall.'},
            {'day': 3, 'title': 'Desert Safari', 'desc': 'Dune bashing, BBQ dinner.'},
            {'day': 4, 'title': 'Abu Dhabi day', 'desc': 'Sheikh Zayed Mosque, Louvre Abu Dhabi.'},
            {'day': 5, 'title': 'Depart', 'desc': 'Gold Souk, fly out.'},
        ],
    },
    'au': {
        'best_time': 'September to November',
        'currency': 'AUD', 'language': 'English',
        'weather': 'Diverse; Sydney 18–26°C in spring',
        'attractions': [
            {'id': 'a1', 'name': 'Sydney Opera House', 'city': 'Sydney'},
            {'id': 'a2', 'name': 'Great Barrier Reef', 'city': 'Cairns'},
            {'id': 'a3', 'name': 'Uluru', 'city': 'Northern Territory'},
            {'id': 'a4', 'name': 'Bondi Beach', 'city': 'Sydney'},
            {'id': 'a5', 'name': 'Great Ocean Road', 'city': 'Victoria'},
        ],
        'itinerary': [
            {'day': 1, 'title': 'Arrive Sydney', 'desc': 'Opera House, Circular Quay.'},
            {'day': 2, 'title': 'Bondi & Manly', 'desc': 'Beach hopping, ferry rides.'},
            {'day': 3, 'title': 'Blue Mountains', 'desc': 'Three Sisters lookout.'},
            {'day': 4, 'title': 'Fly to Cairns', 'desc': 'Reef snorkel cruise.'},
            {'day': 5, 'title': 'Daintree Rainforest', 'desc': 'River cruise, wildlife.'},
            {'day': 6, 'title': 'Fly to Melbourne', 'desc': 'Coffee culture, Federation Sq.'},
            {'day': 7, 'title': 'Great Ocean Road', 'desc': 'Twelve Apostles drive.'},
            {'day': 8, 'title': 'Phillip Island', 'desc': 'Penguin parade.'},
            {'day': 9, 'title': 'Sydney return', 'desc': 'Harbour Bridge climb.'},
            {'day': 10, 'title': 'Depart', 'desc': 'Last brunch, fly home.'},
        ],
    },
    'ca': {
        'best_time': 'June to September',
        'currency': 'CAD', 'language': 'English / French',
        'weather': 'Cold winters; Summer 18–26°C',
        'attractions': [
            {'id': 'a1', 'name': 'Niagara Falls', 'city': 'Ontario'},
            {'id': 'a2', 'name': 'Banff National Park', 'city': 'Alberta'},
            {'id': 'a3', 'name': 'CN Tower', 'city': 'Toronto'},
            {'id': 'a4', 'name': 'Old Quebec', 'city': 'Quebec City'},
            {'id': 'a5', 'name': 'Vancouver Stanley Park', 'city': 'Vancouver'},
        ],
        'itinerary': [
            {'day': 1, 'title': 'Arrive Toronto', 'desc': 'CN Tower, Distillery District.'},
            {'day': 2, 'title': 'Niagara Falls', 'desc': 'Hornblower cruise, falls illumination.'},
            {'day': 3, 'title': 'Fly to Calgary', 'desc': 'Drive to Banff via Bow Valley.'},
            {'day': 4, 'title': 'Lake Louise', 'desc': 'Canoe, Moraine Lake, Johnston Canyon.'},
            {'day': 5, 'title': 'Icefields Parkway', 'desc': 'Athabasca Glacier, Peyto Lake.'},
            {'day': 6, 'title': 'Fly to Vancouver', 'desc': 'Stanley Park, Granville Island.'},
            {'day': 7, 'title': 'Whistler day', 'desc': 'Sea-to-Sky Highway, Peak chairlift.'},
            {'day': 8, 'title': 'Depart', 'desc': 'Last harbour walk, fly home.'},
        ],
    },
    'it': {
        'best_time': 'April to June, September to October',
        'currency': 'EUR', 'language': 'Italian',
        'weather': 'Mediterranean; Spring 16–22°C',
        'attractions': [
            {'id': 'a1', 'name': 'Colosseum', 'city': 'Rome'},
            {'id': 'a2', 'name': 'Venice canals', 'city': 'Venice'},
            {'id': 'a3', 'name': 'Florence Duomo', 'city': 'Florence'},
            {'id': 'a4', 'name': 'Amalfi Coast', 'city': 'Salerno'},
            {'id': 'a5', 'name': 'Pompeii', 'city': 'Naples'},
        ],
        'itinerary': [
            {'day': 1, 'title': 'Arrive Rome', 'desc': 'Trevi Fountain, Spanish Steps.'},
            {'day': 2, 'title': 'Ancient Rome', 'desc': 'Colosseum, Roman Forum, Palatine Hill.'},
            {'day': 3, 'title': 'Vatican City', 'desc': 'St Peter\'s, Sistine Chapel.'},
            {'day': 4, 'title': 'Train to Florence', 'desc': 'Duomo, Uffizi.'},
            {'day': 5, 'title': 'Tuscany', 'desc': 'Wine tour, Siena.'},
            {'day': 6, 'title': 'Train to Venice', 'desc': 'Gondola ride, St Mark\'s.'},
            {'day': 7, 'title': 'Burano + Murano', 'desc': 'Colourful islands.'},
            {'day': 8, 'title': 'Depart', 'desc': 'Last gelato, fly home.'},
        ],
    },
    'ch': {
        'best_time': 'June to August (summer) or December–March (skiing)',
        'currency': 'CHF', 'language': 'German / French / Italian',
        'weather': 'Alpine; Summer 14–22°C',
        'attractions': [
            {'id': 'a1', 'name': 'Matterhorn', 'city': 'Zermatt'},
            {'id': 'a2', 'name': 'Lake Lucerne', 'city': 'Lucerne'},
            {'id': 'a3', 'name': 'Jungfraujoch', 'city': 'Bernese Oberland'},
            {'id': 'a4', 'name': 'Old Town Bern', 'city': 'Bern'},
            {'id': 'a5', 'name': 'Lake Geneva', 'city': 'Geneva'},
        ],
        'itinerary': [
            {'day': 1, 'title': 'Arrive Zurich', 'desc': 'Old Town, Lake Zurich cruise.'},
            {'day': 2, 'title': 'Lucerne', 'desc': 'Chapel Bridge, Mt Pilatus cable car.'},
            {'day': 3, 'title': 'Interlaken', 'desc': 'Two lakes, paragliding.'},
            {'day': 4, 'title': 'Jungfraujoch', 'desc': 'Top of Europe train.'},
            {'day': 5, 'title': 'Train to Zermatt', 'desc': 'Matterhorn views.'},
            {'day': 6, 'title': 'Glacier Express', 'desc': 'Zermatt to St Moritz.'},
            {'day': 7, 'title': 'Depart Zurich', 'desc': 'Last walk, fly home.'},
        ],
    },
    'th': {
        'best_time': 'November to February',
        'currency': 'THB', 'language': 'Thai',
        'weather': 'Tropical; Winter 22–32°C',
        'attractions': [
            {'id': 'a1', 'name': 'Grand Palace', 'city': 'Bangkok'},
            {'id': 'a2', 'name': 'Phi Phi Islands', 'city': 'Krabi'},
            {'id': 'a3', 'name': 'Phuket beaches', 'city': 'Phuket'},
            {'id': 'a4', 'name': 'Chiang Mai temples', 'city': 'Chiang Mai'},
            {'id': 'a5', 'name': 'Floating markets', 'city': 'Damnoen Saduak'},
        ],
        'itinerary': [
            {'day': 1, 'title': 'Arrive Bangkok', 'desc': 'Khao San Road, Wat Pho.'},
            {'day': 2, 'title': 'Grand Palace', 'desc': 'Wat Arun, river cruise.'},
            {'day': 3, 'title': 'Floating markets', 'desc': 'Damnoen Saduak day tour.'},
            {'day': 4, 'title': 'Fly to Phuket', 'desc': 'Patong, sunset on Promthep.'},
            {'day': 5, 'title': 'Phi Phi day', 'desc': 'Speedboat tour, snorkeling.'},
            {'day': 6, 'title': 'James Bond Island', 'desc': 'Phang Nga Bay tour.'},
        ],
    },
    'de': {
        'best_time': 'May to September',
        'currency': 'EUR', 'language': 'German',
        'weather': 'Cool & temperate; Summer 18–25°C',
        'attractions': [
            {'id': 'a1', 'name': 'Brandenburg Gate', 'city': 'Berlin'},
            {'id': 'a2', 'name': 'Neuschwanstein Castle', 'city': 'Bavaria'},
            {'id': 'a3', 'name': 'Cologne Cathedral', 'city': 'Cologne'},
            {'id': 'a4', 'name': 'Romantic Road', 'city': 'Rothenburg'},
            {'id': 'a5', 'name': 'Black Forest', 'city': 'Baden-Württemberg'},
        ],
        'itinerary': [
            {'day': 1, 'title': 'Arrive Berlin', 'desc': 'Brandenburg Gate, East Side Gallery.'},
            {'day': 2, 'title': 'WWII history', 'desc': 'Holocaust Memorial, Reichstag.'},
            {'day': 3, 'title': 'Train to Munich', 'desc': 'Marienplatz, beer hall dinner.'},
            {'day': 4, 'title': 'Neuschwanstein', 'desc': 'Castle day trip, Hohenschwangau.'},
            {'day': 5, 'title': 'Romantic Road', 'desc': 'Rothenburg ob der Tauber.'},
            {'day': 6, 'title': 'Black Forest', 'desc': 'Triberg, cuckoo clocks.'},
            {'day': 7, 'title': 'Frankfurt depart', 'desc': 'Old town, fly out.'},
        ],
    },
    'np': {
        'best_time': 'October to November or March to April',
        'currency': 'NPR', 'language': 'Nepali / English',
        'weather': 'Himalayan; Kathmandu 12–20°C in autumn',
        'attractions': [
            {'id': 'a1', 'name': 'Pashupatinath Temple', 'city': 'Kathmandu'},
            {'id': 'a2', 'name': 'Pokhara Lakeside', 'city': 'Pokhara'},
            {'id': 'a3', 'name': 'Annapurna Base Camp', 'city': 'Annapurna'},
            {'id': 'a4', 'name': 'Boudhanath Stupa', 'city': 'Kathmandu'},
            {'id': 'a5', 'name': 'Chitwan Safari', 'city': 'Chitwan'},
        ],
        'itinerary': [
            {'day': 1, 'title': 'Arrive Kathmandu', 'desc': 'Thamel walk, Pashupatinath evening aarti.'},
            {'day': 2, 'title': 'Heritage tour', 'desc': 'Boudhanath, Swayambhunath, Patan Durbar.'},
            {'day': 3, 'title': 'Drive to Pokhara', 'desc': 'Lakeside, World Peace Pagoda.'},
            {'day': 4, 'title': 'Sarangkot sunrise', 'desc': 'Annapurna range, paragliding.'},
            {'day': 5, 'title': 'Return Kathmandu', 'desc': 'Souvenir shopping, fly out.'},
        ],
    },
    'bt': {
        'best_time': 'October to December or March to May',
        'currency': 'BTN / INR', 'language': 'Dzongkha / English',
        'weather': 'Himalayan; Spring 8–20°C',
        'attractions': [
            {'id': 'a1', 'name': 'Tiger\'s Nest Monastery', 'city': 'Paro'},
            {'id': 'a2', 'name': 'Punakha Dzong', 'city': 'Punakha'},
            {'id': 'a3', 'name': 'Buddha Dordenma', 'city': 'Thimphu'},
            {'id': 'a4', 'name': 'Dochula Pass', 'city': 'Dochula'},
            {'id': 'a5', 'name': 'Phobjikha Valley', 'city': 'Wangdue'},
        ],
        'itinerary': [
            {'day': 1, 'title': 'Arrive Paro', 'desc': 'Drive to Thimphu, market visit.'},
            {'day': 2, 'title': 'Thimphu sights', 'desc': 'Buddha Dordenma, Memorial Chorten.'},
            {'day': 3, 'title': 'Dochula to Punakha', 'desc': 'Punakha Dzong at confluence.'},
            {'day': 4, 'title': 'Phobjikha Valley', 'desc': 'Crane sanctuary, Gangtey monastery.'},
            {'day': 5, 'title': 'Return to Paro', 'desc': 'Rinpung Dzong, hot stone bath.'},
            {'day': 6, 'title': 'Tiger\'s Nest hike', 'desc': 'Day hike to Taktsang monastery, fly home.'},
        ],
    },
}


def get_country(country_id: str):
    return next((c for c in COUNTRIES if c['id'] == country_id), None)


def get_holiday_plan(country_id: str):
    return HOLIDAY_PLANS.get(country_id) or {
        'best_time': 'Year round', 'currency': '—', 'language': '—',
        'weather': 'Pleasant most of the year',
        'attractions': [
            {'id': 'g1', 'name': 'Capital tour', 'city': 'Capital'},
            {'id': 'g2', 'name': 'Cultural museum', 'city': 'Capital'},
            {'id': 'g3', 'name': 'Famous landmark', 'city': 'Tier 1'},
            {'id': 'g4', 'name': 'Beach / Mountains', 'city': 'Outdoors'},
            {'id': 'g5', 'name': 'Local market', 'city': 'Old town'},
        ],
        'itinerary': [
            {'day': i, 'title': f'Day {i}', 'desc': 'Suggested activities for the day.'}
            for i in range(1, 8)
        ],
    }
