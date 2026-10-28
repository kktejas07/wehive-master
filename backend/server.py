import asyncio
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

from config import FRONTEND_URL, IS_DEV  # noqa: E402
from db import ensure_indexes  # noqa: E402
from routes_auth import router as auth_router  # noqa: E402
from routes_users import router as users_router  # noqa: E402
from routes_countries import router as countries_router  # noqa: E402
from routes_leads import router as leads_router  # noqa: E402
from routes_visa_providers import router as visa_providers_router  # noqa: E402
from routes_apps import router as apps_router  # noqa: E402
from routes_chatbot import router as chatbot_router  # noqa: E402
from routes_scan import router as scan_router  # noqa: E402
from routes_flights import router as flights_router  # noqa: E402
from routes_admin import router as admin_router  # noqa: E402
from routes_admin_backoffice import router as admin_backoffice_router  # noqa: E402
from routes_admin_cases import router as admin_cases_router  # noqa: E402
from routes_admin_ops import router as admin_ops_router  # noqa: E402
from routes_admin_refunds import router as admin_refunds_router  # noqa: E402
from routes_admin_doc_review import router as admin_doc_review_router  # noqa: E402
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
from routes_community import router as community_router  # noqa: E402
from routes_interview_score import router as interview_score_router  # noqa: E402
from routes_newsletter import router as newsletter_router  # noqa: E402
from routes_newsletter_campaigns import router as newsletter_campaigns_router, mark_interrupted_on_boot  # noqa: E402
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
from routes_google_knowledge import router as google_knowledge_router, public_router as google_knowledge_public_router  # noqa: E402
from routes_agentic_ai import router as agentic_ai_router  # noqa: E402
from routes_ai_operations import router as ai_operations_router  # noqa: E402
from routes_mcp import router as mcp_router  # noqa: E402
from routes_training import router as training_router  # noqa: E402
from routes_knowledge_services import router as knowledge_services_router  # noqa: E402
from routes_model_router import router as model_router_router  # noqa: E402
from routes_n8n import router as n8n_router  # noqa: E402
from routes_adapters import router as adapters_router  # noqa: E402
from routes_travel import router as travel_router  # noqa: E402
from routes_intakes import router as intakes_router  # noqa: E402
from routes_financials import router as financials_router  # noqa: E402
from routes_observability import router as observability_router  # noqa: E402
from routes_rag_eval import router as rag_eval_router  # noqa: E402
from routes_student_memory import router as student_memory_router  # noqa: E402
from routes_graph_rag import router as graph_rag_router  # noqa: E402
from routes_scraping import router as scraping_router  # noqa: E402
from routes_content_pipeline import router as content_pipeline_router  # noqa: E402
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
api_router.include_router(visa_providers_router)
api_router.include_router(users_router)
api_router.include_router(apps_router)
api_router.include_router(chatbot_router)
api_router.include_router(scan_router)
api_router.include_router(flights_router)
api_router.include_router(countries_router)
api_router.include_router(leads_router)
api_router.include_router(admin_router)
api_router.include_router(admin_backoffice_router)
api_router.include_router(admin_cases_router)
api_router.include_router(admin_ops_router)
api_router.include_router(admin_refunds_router)
api_router.include_router(admin_doc_review_router)
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
api_router.include_router(community_router)
api_router.include_router(interview_score_router)
api_router.include_router(newsletter_router)
api_router.include_router(newsletter_campaigns_router)
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
api_router.include_router(google_knowledge_public_router)
api_router.include_router(google_knowledge_router)
api_router.include_router(agentic_ai_router)
api_router.include_router(ai_operations_router)
api_router.include_router(mcp_router)
api_router.include_router(training_router)
api_router.include_router(knowledge_services_router)
api_router.include_router(model_router_router)
api_router.include_router(n8n_router)
api_router.include_router(adapters_router)
api_router.include_router(travel_router)
api_router.include_router(intakes_router)
api_router.include_router(financials_router)
api_router.include_router(observability_router)
api_router.include_router(rag_eval_router)
api_router.include_router(student_memory_router)
api_router.include_router(graph_rag_router)
api_router.include_router(scraping_router)
api_router.include_router(content_pipeline_router)

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
        if o == '*':
            _exact_origins = ['*']
            _wildcard_regexes = []
            break
        if '*' in o:
            pattern = re.escape(o).replace(r'\*', '[^/]*')
            _wildcard_regexes.append(f'^{pattern}$')
            bare = o.replace('*.', '').replace('*', '')
            if bare not in _exact_origins:
                _exact_origins.append(bare)
        else:
            _exact_origins.append(o)

if not _exact_origins and not _wildcard_regexes:
    # Default: the configured public site, plus its www/apex twin.
    _scheme, _, _host = FRONTEND_URL.partition('://')
    _twin = _host[4:] if _host.startswith('www.') else f'www.{_host}'
    _allow_origins = [FRONTEND_URL]
    if '.' in _host and not _host.replace('.', '').replace(':', '').isdigit():
        _allow_origins.append(f'{_scheme}://{_twin}')
    _origin_regex = None
elif _exact_origins and not _wildcard_regexes:
    _allow_origins = _exact_origins
    _origin_regex = None
else:
    _allow_origins = _exact_origins if _exact_origins else ['*']
    _origin_regex = '|'.join(_wildcard_regexes) if _wildcard_regexes else None

app.add_middleware(
    CORSMiddleware,
    # Never combine a wildcard origin with credentials.
    allow_credentials='*' not in _allow_origins,
    allow_origins=_allow_origins,
    allow_origin_regex=_origin_regex,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.middleware('http')
async def add_security_headers(request, call_next):
    """Baseline security headers missing from every response (see F3 in
    playwright/REPORT.md). Deliberately does NOT set Content-Security-Policy here —
    a separate Cloudflare-managed Report-Only CSP already exists and is mismatched
    with the app's real resource origins (Firebase, PostHog, Razorpay, own bundle);
    adding a second, hastily-scoped CSP risks compounding that rather than fixing it
    (see F4). CSP needs its own careful allowlist pass, not a quick add here.
    """
    response = await call_next(request)
    response.headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    return response

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
    # 'ctx' can hold raw exception objects (e.g. a validator's ValueError) that
    # are not JSON-serialisable; 'msg' already carries the readable message.
    errors = [{k: v for k, v in err.items() if k != 'ctx'} for err in exc.errors()]
    logger.warning('Validation error: %s', errors, extra={'path': str(request.url)})
    return JSONResponse(status_code=422, content={'ok': False, 'detail': errors})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception('Unhandled error: %s', exc, extra={'path': str(request.url)})
    return JSONResponse(status_code=500, content={'ok': False, 'detail': 'Internal server error'})


async def _warm_up_and_bootstrap_rag():
    try:
        # Choose and load the embedding model before anything is ingested.
        from embeddings_bge import warm_up as warm_up_embeddings
        logger.info('Embeddings backend: %s', await asyncio.to_thread(warm_up_embeddings))
    except Exception as e:
        logger.exception('Embeddings warm-up failed: %s', e)

    try:
        from bootstrap_rag import bootstrap_rag_and_prompts
        await bootstrap_rag_and_prompts(db)
    except Exception as e:
        logger.exception('RAG/prompts bootstrap failed: %s', e)

    try:
        from graph_rag import build_graph
        stats = await build_graph()
        logger.info('GraphRAG built: %s', stats)
    except Exception as e:
        logger.exception('GraphRAG build failed: %s', e)

    try:
        from scraping_agent import seed_default_targets
        seeded = await seed_default_targets()
        if seeded:
            logger.info('Seeded %d default scrape targets', seeded)
    except Exception as e:
        logger.exception('Scrape target seeding failed: %s', e)


@app.on_event('startup')
async def on_startup():
    try:
        await ensure_indexes()
        await ensure_seed_admin()
        await mark_interrupted_on_boot()
        count = await countries_v2.estimated_document_count()
        if count == 0:
            logger.info('Countries collection empty — seeding …')
            res = await seed_countries()
            logger.info('Seeded countries: %s', res)
        else:
            logger.info('Countries collection already has %d docs', count)
        logger.info('Indexes ensured. OTP channel = %s', os.environ.get('OTP_CHANNEL', 'mock' if IS_DEV else '') or 'unset (OTP disabled)')
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
        # ReAct agents (agents-v2) resolve tools by name from this registry.
        from tool_registry import register_all as register_agent_tools
        register_agent_tools()
    except Exception as e:
        logger.exception('Agent tool registration failed: %s', e)

    # In the background: loading BGE-M3 and (re)ingesting an empty vector store can
    # take minutes on CPU, and the app works without RAG until it finishes.
    app.state.rag_bootstrap = asyncio.create_task(_warm_up_and_bootstrap_rag())

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
