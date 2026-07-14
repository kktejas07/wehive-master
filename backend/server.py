import re
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, APIRouter, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware

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
from routes_events import router as events_router  # noqa: E402
from routes_blogs import router as blogs_router  # noqa: E402
from routes_news import router as news_router  # noqa: E402
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
from routes_university_apps import router as university_apps_router  # noqa: E402
from routes_admin_universities import router as admin_universities_router  # noqa: E402
from routes_ai_universities import router as ai_universities_router  # noqa: E402
from routes_programs import router as programs_router, admin_router as admin_programs_router  # noqa: E402
from routes_reviews import router as reviews_router  # noqa: E402
from routes_i18n import router as i18n_router  # noqa: E402
from routes_agents_ai import router as agents_ai_router, start_scheduler  # noqa: E402
from routes_rag import router as rag_router  # noqa: E402
from routes_prompts import router as prompts_router  # noqa: E402
from routes_agents_v2 import router as agents_v2_router  # noqa: E402
from routes_hive_learning import router as hive_learning_router  # noqa: E402
from routes_slot_monitor import router as slot_monitor_router  # noqa: E402
from routes_learning_resources import router as learning_resources_router  # noqa: E402
from routes_people_intelligence import router as people_intelligence_router  # noqa: E402
from routes_gen_ai import router as gen_ai_router  # noqa: E402
from routes_open_source import router as open_source_router  # noqa: E402
from routes_google_knowledge import router as google_knowledge_router  # noqa: E402
from routes_agentic_ai import router as agentic_ai_router  # noqa: E402
from routes_ai_operations import router as ai_operations_router  # noqa: E402
from routes_mcp import router as mcp_router  # noqa: E402
from routes_training import router as training_router  # noqa: E402
from routes_knowledge_services import router as knowledge_services_router  # noqa: E402
from routes_model_router import router as model_router_router  # noqa: E402
from routes_n8n import router as n8n_router  # noqa: E402
from routes_adapters import router as adapters_router  # noqa: E402
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
    }


@api_router.get('/health')
async def health():
    checks = {}
    try:
        await db.command('ping')
        checks['database'] = 'ok'
    except Exception:
        checks['database'] = 'error'
    ok = all(v == 'ok' for v in checks.values())
    status_code = 200 if ok else 503
    return JSONResponse(status_code=status_code, content={'ok': ok, 'checks': checks})


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
api_router.include_router(events_router)
api_router.include_router(blogs_router)
api_router.include_router(news_router)
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
api_router.include_router(university_apps_router)
api_router.include_router(admin_universities_router)
api_router.include_router(ai_universities_router)
api_router.include_router(programs_router)
api_router.include_router(admin_programs_router)
api_router.include_router(reviews_router)
api_router.include_router(i18n_router)
api_router.include_router(agents_ai_router)
api_router.include_router(rag_router)
api_router.include_router(prompts_router)
api_router.include_router(agents_v2_router)
api_router.include_router(hive_learning_router)
api_router.include_router(slot_monitor_router)
api_router.include_router(learning_resources_router)
api_router.include_router(people_intelligence_router)
api_router.include_router(gen_ai_router)
api_router.include_router(open_source_router)
api_router.include_router(google_knowledge_router)
api_router.include_router(agentic_ai_router)
api_router.include_router(ai_operations_router)
api_router.include_router(mcp_router)
api_router.include_router(training_router)
api_router.include_router(knowledge_services_router)
api_router.include_router(model_router_router)
api_router.include_router(n8n_router)
api_router.include_router(adapters_router)

app.include_router(api_router)

@app.on_event("startup")
async def startup():
    start_scheduler()
    from slot_monitor import start_slot_monitor
    start_slot_monitor()

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

class JsonFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps({
            'ts': datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'line': record.lineno,
        }, default=str)

_handler = logging.StreamHandler()
_handler.setFormatter(JsonFormatter())
root = logging.getLogger()
root.handlers.clear()
root.addHandler(_handler)
root.setLevel(logging.INFO)
logger = logging.getLogger('wehive')


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.warning('HTTP %s: %s', exc.status_code, exc.detail, extra={'path': str(request.url)})
    return JSONResponse(status_code=exc.status_code, content={'ok': False, 'detail': exc.detail})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning('Validation error: %s', exc.errors(), extra={'path': str(request.url)})
    return JSONResponse(status_code=422, content={'ok': False, 'detail': exc.errors()})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception('Unhandled error: %s', exc, extra={'path': str(request.url)})
    return JSONResponse(status_code=500, content={'ok': False, 'detail': 'Internal server error'})


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
        uni_count = await db['universities_v2'].estimated_document_count()
        if uni_count < 100:
            logger.info('Universities count low (%d) — (re)seeding …', uni_count)
            res = await seed_universities()
            logger.info('Seeded universities: %s', res)
        else:
            logger.info('Universities collection has %d docs', uni_count)
    except Exception as e:
        logger.exception('Startup failure: %s', e)

    try:
        from bootstrap_rag import bootstrap_rag_and_prompts
        await bootstrap_rag_and_prompts(db)
    except Exception as e:
        logger.exception('RAG/prompts bootstrap failed: %s', e)

    try:
        ev_count = await db['events'].estimated_document_count()
        if ev_count == 0:
            from seed_events import seed as seed_events
            seeded = await seed_events()
            logger.info('Seeded %d promotional events', seeded)
        else:
            logger.info('Promotional events collection already has %d docs', ev_count)
    except Exception as e:
        logger.exception('Promotional event seed failed: %s', e)


@app.on_event('shutdown')
async def on_shutdown():
    from db import client
    client.close()
