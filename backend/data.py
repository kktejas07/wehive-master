"""Country + visa metadata, mirrored from frontend mock for backend filtering.
In production this would live in MongoDB, seeded on first run.
"""

from typing import List, Dict, Any

COUNTRIES: List[Dict[str, Any]] = [
    {'id': 'us', 'name': 'United States', 'flag': '\U0001F1FA\U0001F1F8', 'visa_required': True, 'no_visa': False, 'category': 'tourist_business', 'visa_types': ['Tourist', 'Business', 'Student', 'Work'], 'documents': ['Passport', 'Photo', 'Bank statements', 'Cover letter'], 'delivery': {'standard_days': 35, 'rush_days': 14, 'same_day': False}, 'fees_usd': 185, 'validity': '10 YEARS', 'holiday_default_days': 10},
    {'id': 'uk', 'name': 'United Kingdom', 'flag': '\U0001F1EC\U0001F1E7', 'visa_required': True, 'no_visa': False, 'category': 'tourist', 'visa_types': ['Tourist', 'Business', 'Student'], 'documents': ['Passport', 'Photo', 'Bank statements'], 'delivery': {'standard_days': 15, 'rush_days': 5, 'same_day': False}, 'fees_usd': 140, 'validity': '6 MONTHS', 'holiday_default_days': 7},
    {'id': 'jp', 'name': 'Japan', 'flag': '\U0001F1EF\U0001F1F5', 'visa_required': True, 'no_visa': False, 'category': 'tourist', 'visa_types': ['Tourist', 'Business'], 'documents': ['Passport', 'Photo'], 'delivery': {'standard_days': 7, 'rush_days': 3, 'same_day': False}, 'fees_usd': 45, 'validity': '90 DAYS', 'holiday_default_days': 7},
    {'id': 'fr', 'name': 'France', 'flag': '\U0001F1EB\U0001F1F7', 'visa_required': True, 'no_visa': False, 'category': 'schengen', 'visa_types': ['Tourist', 'Business', 'Student'], 'documents': ['Passport', 'Photo', 'Bank statements', 'Insurance'], 'delivery': {'standard_days': 12, 'rush_days': 5, 'same_day': False}, 'fees_usd': 95, 'validity': '90 DAYS', 'holiday_default_days': 7},
    {'id': 'sg', 'name': 'Singapore', 'flag': '\U0001F1F8\U0001F1EC', 'visa_required': True, 'no_visa': False, 'category': 'tourist', 'visa_types': ['Tourist', 'Business'], 'documents': ['Passport', 'Photo'], 'delivery': {'standard_days': 4, 'rush_days': 2, 'same_day': True}, 'fees_usd': 30, 'validity': '63 DAYS', 'holiday_default_days': 5},
    {'id': 'ae', 'name': 'United Arab Emirates', 'flag': '\U0001F1E6\U0001F1EA', 'visa_required': True, 'no_visa': False, 'category': 'tourist_business', 'visa_types': ['Tourist', 'Business'], 'documents': ['Passport', 'Photo'], 'delivery': {'standard_days': 3, 'rush_days': 1, 'same_day': True}, 'fees_usd': 80, 'validity': '60 DAYS', 'holiday_default_days': 5},
    {'id': 'au', 'name': 'Australia', 'flag': '\U0001F1E6\U0001F1FA', 'visa_required': True, 'no_visa': False, 'category': 'tourist', 'visa_types': ['Tourist', 'Business', 'Student', 'Work'], 'documents': ['Passport', 'Photo', 'Bank statements'], 'delivery': {'standard_days': 9, 'rush_days': 4, 'same_day': False}, 'fees_usd': 160, 'validity': '12 MONTHS', 'holiday_default_days': 10},
    {'id': 'ca', 'name': 'Canada', 'flag': '\U0001F1E8\U0001F1E6', 'visa_required': True, 'no_visa': False, 'category': 'tourist', 'visa_types': ['Tourist', 'Business', 'Student', 'Work'], 'documents': ['Passport', 'Photo', 'Bank statements'], 'delivery': {'standard_days': 14, 'rush_days': 7, 'same_day': False}, 'fees_usd': 120, 'validity': '5 YEARS', 'holiday_default_days': 8},
    {'id': 'it', 'name': 'Italy', 'flag': '\U0001F1EE\U0001F1F9', 'visa_required': True, 'no_visa': False, 'category': 'schengen', 'visa_types': ['Tourist', 'Business'], 'documents': ['Passport', 'Photo', 'Insurance'], 'delivery': {'standard_days': 12, 'rush_days': 5, 'same_day': False}, 'fees_usd': 95, 'validity': '90 DAYS', 'holiday_default_days': 8},
    {'id': 'ch', 'name': 'Switzerland', 'flag': '\U0001F1E8\U0001F1ED', 'visa_required': True, 'no_visa': False, 'category': 'schengen', 'visa_types': ['Tourist', 'Business'], 'documents': ['Passport', 'Photo', 'Insurance'], 'delivery': {'standard_days': 12, 'rush_days': 5, 'same_day': False}, 'fees_usd': 95, 'validity': '90 DAYS', 'holiday_default_days': 7},
    {'id': 'th', 'name': 'Thailand', 'flag': '\U0001F1F9\U0001F1ED', 'visa_required': True, 'no_visa': False, 'category': 'tourist', 'visa_types': ['Tourist'], 'documents': ['Passport', 'Photo'], 'delivery': {'standard_days': 5, 'rush_days': 2, 'same_day': True}, 'fees_usd': 40, 'validity': '60 DAYS', 'holiday_default_days': 6},
    {'id': 'de', 'name': 'Germany', 'flag': '\U0001F1E9\U0001F1EA', 'visa_required': True, 'no_visa': False, 'category': 'schengen', 'visa_types': ['Tourist', 'Business', 'Student', 'Work'], 'documents': ['Passport', 'Photo', 'Insurance'], 'delivery': {'standard_days': 12, 'rush_days': 5, 'same_day': False}, 'fees_usd': 95, 'validity': '90 DAYS', 'holiday_default_days': 7},
    {'id': 'np', 'name': 'Nepal', 'flag': '\U0001F1F3\U0001F1F5', 'visa_required': False, 'no_visa': True, 'category': 'tourist', 'visa_types': ['Tourist'], 'documents': [], 'delivery': {'standard_days': 0, 'rush_days': 0, 'same_day': True}, 'fees_usd': 0, 'validity': 'NOT REQUIRED', 'holiday_default_days': 5},
    {'id': 'bt', 'name': 'Bhutan', 'flag': '\U0001F1E7\U0001F1F9', 'visa_required': False, 'no_visa': True, 'category': 'tourist', 'visa_types': ['Tourist'], 'documents': [], 'delivery': {'standard_days': 0, 'rush_days': 0, 'same_day': True}, 'fees_usd': 0, 'validity': 'NOT REQUIRED', 'holiday_default_days': 6},
]


# Holiday planner content per country
HOLIDAY_PLANS: Dict[str, Dict[str, Any]] = {
    'us': {
        'best_time': 'May to October',
        'currency': 'USD',
        'language': 'English',
        'weather': 'Temperate, varies widely; Summer 25\u201335\u00B0C',
        'attractions': [
            {'id': 'a1', 'name': 'Statue of Liberty', 'city': 'New York'},
            {'id': 'a2', 'name': 'Grand Canyon', 'city': 'Arizona'},
            {'id': 'a3', 'name': 'Times Square', 'city': 'New York'},
            {'id': 'a4', 'name': 'Golden Gate Bridge', 'city': 'San Francisco'},
            {'id': 'a5', 'name': 'Walt Disney World', 'city': 'Orlando'},
        ],
        'itinerary': [
            {'day': 1, 'title': 'Land in NYC', 'desc': 'Check-in, walk Times Square, Brooklyn Bridge sunset.'},
            {'day': 2, 'title': 'Liberty + Wall Street', 'desc': 'Statue of Liberty ferry, Ellis Island, Wall Street tour.'},
            {'day': 3, 'title': 'Museums', 'desc': 'MoMA, Central Park, Top of the Rock.'},
            {'day': 4, 'title': 'Fly to Las Vegas', 'desc': 'Strip walk, Bellagio fountains, late-night show.'},
            {'day': 5, 'title': 'Grand Canyon', 'desc': 'Day trip to South Rim. Helicopter optional.'},
            {'day': 6, 'title': 'Fly to San Francisco', 'desc': 'Pier 39, Fisherman\u2019s Wharf, cable car.'},
            {'day': 7, 'title': 'Golden Gate', 'desc': 'Bike across Golden Gate, Alcatraz tour.'},
        ],
    },
    'uk': {
        'best_time': 'May to September',
        'currency': 'GBP',
        'language': 'English',
        'weather': 'Cool & rainy; Summer 18\u201325\u00B0C',
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
        'best_time': 'March\u2013April (cherry blossoms) or October\u2013November',
        'currency': 'JPY',
        'language': 'Japanese',
        'weather': 'Mild; Spring 12\u201320\u00B0C',
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
}


def get_country(country_id: str):
    return next((c for c in COUNTRIES if c['id'] == country_id), None)


def get_holiday_plan(country_id: str):
    return HOLIDAY_PLANS.get(country_id) or {
        'best_time': 'Year round',
        'currency': '\u2014',
        'language': '\u2014',
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
