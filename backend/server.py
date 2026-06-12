import re
from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import logging
import os
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from db import ensure_indexes  # noqa: E402
from routes_auth import router as auth_router  # noqa: E402
from routes_users import router as users_router  # noqa: E402
from routes_countries import router as countries_router  # noqa: E402
from routes_leads import router as leads_router  # noqa: E402
from routes_apps import router as apps_router  # noqa: E402
from routes_chatbot import router as chatbot_router  # noqa: E402
from routes_scan import router as scan_router  # noqa: E402
from routes_flights import router as flights_router  # noqa: E402
from routes_admin import router as admin_router  # noqa: E402
from routes_admin_auth import router as admin_auth_router, ensure_seed_admin  # noqa: E402
from routes_public import router as public_router  # noqa: E402
from routes_ai_docs import router as ai_docs_router  # noqa: E402
from routes_payments import router as payments_router  # noqa: E402
from routes_notifications import router as notifications_router  # noqa: E402
from routes_referrals import router as referrals_router  # noqa: E402
from routes_ai_marketplace import router as ai_marketplace_router  # noqa: E402
from routes_third_party import router as third_party_router  # noqa: E402
from routes_universities import router as universities_router  # noqa: E402
from routes_communication import router as communication_router  # noqa: E402
from routes_profile_requests import router as profile_requests_router  # noqa: E402
from routes_promotions import router as promotions_router  # noqa: E402
from routes_agents import router as agents_router  # noqa: E402
from routes_visa_scheduling import router as visa_scheduling_router  # noqa: E402
from routes_shortlist import router as shortlist_router  # noqa: E402
from seed_countries import seed as seed_countries  # noqa: E402
from seed_universities import seed as seed_universities  # noqa: E402
from db import countries_v2, db  # noqa: E402

app = FastAPI(title='We Hive API', version='1.0.0')

api_router = APIRouter(prefix='/api')


@api_router.get('/')
async def root():
    return {
        'service': 'We Hive API',
        'status': 'ok',
        'otp_channel': os.environ.get('OTP_CHANNEL', 'mock'),
    }


@api_router.get('/health')
async def health():
    return {'ok': True}


# Mount routers under /api
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(apps_router)
api_router.include_router(chatbot_router)
api_router.include_router(scan_router)
api_router.include_router(flights_router)
api_router.include_router(countries_router)
api_router.include_router(leads_router)
api_router.include_router(admin_router)
api_router.include_router(admin_auth_router)
api_router.include_router(public_router)
api_router.include_router(ai_docs_router)
api_router.include_router(payments_router)
api_router.include_router(notifications_router)
api_router.include_router(referrals_router)
api_router.include_router(ai_marketplace_router)
api_router.include_router(third_party_router)
api_router.include_router(universities_router)
api_router.include_router(communication_router)
api_router.include_router(profile_requests_router)
api_router.include_router(promotions_router)
api_router.include_router(agents_router)
api_router.include_router(visa_scheduling_router)
api_router.include_router(shortlist_router)

app.include_router(api_router)

_raw_origins = os.environ.get('ALLOWED_ORIGINS', '').strip()
_exact_origins: list[str] = []
_wildcard_regexes: list[str] = []
if _raw_origins:
    for o in [x.strip() for x in _raw_origins.split(',') if x.strip()]:
        if '*' in o:
            pattern = re.escape(o).replace(r'\*', '[^/]*')
            _wildcard_regexes.append(f'^{pattern}$')
            bare = o.replace('*.', '').replace('*', '')
            if bare not in _exact_origins:
                _exact_origins.append(bare)
        else:
            _exact_origins.append(o)

if not _exact_origins and not _wildcard_regexes:
    _allow_origins = ['https://wehive.co.in', 'https://www.wehive.co.in']
    _origin_regex = None
elif _exact_origins and not _wildcard_regexes:
    _allow_origins = _exact_origins
    _origin_regex = None
else:
    _allow_origins = _exact_origins if _exact_origins else ['*']
    _origin_regex = '|'.join(_wildcard_regexes) if _wildcard_regexes else None

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_allow_origins,
    allow_origin_regex=_origin_regex,
    allow_methods=['*'],
    allow_headers=['*'],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger('wehive')


@app.on_event('startup')
async def on_startup():
    try:
        await ensure_indexes()
        await ensure_seed_admin()
        count = await countries_v2.estimated_document_count()
        if count == 0:
            logger.info('Countries collection empty — seeding …')
            res = await seed_countries()
            logger.info('Seeded countries: %s', res)
        else:
            logger.info('Countries collection already has %d docs', count)
<<<<<<< Updated upstream
        logger.info('Startup complete')
=======
        logger.info('Indexes ensured. OTP channel = %s', os.environ.get('OTP_CHANNEL', 'mock'))
        uni_count = await db['universities_v2'].estimated_document_count()
        if uni_count == 0:
            logger.info('Universities collection empty — seeding …')
            res = await seed_universities()
            logger.info('Seeded universities: %s', res)
        else:
            logger.info('Universities collection has %d docs', uni_count)
>>>>>>> Stashed changes
    except Exception as e:
        logger.exception('Startup failure: %s', e)


@app.on_event('shutdown')
async def on_shutdown():
    from db import client
    client.close()
