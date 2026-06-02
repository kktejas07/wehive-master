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
from seed_countries import seed_countries  # noqa: E402
from db import countries_v2  # noqa: E402

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

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=['*'],
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
        logger.info('Indexes ensured. OTP channel = %s', os.environ.get('OTP_CHANNEL', 'mock'))
    except Exception as e:
        logger.exception('Startup failure: %s', e)


@app.on_event('shutdown')
async def on_shutdown():
    from db import client
    client.close()
