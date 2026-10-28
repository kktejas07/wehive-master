import os

ADMIN_EMAILS = {
    e.strip().lower()
    for e in os.environ.get('ADMIN_EMAILS', '').split(',')
    if e.strip()
}

APP_ENV = os.environ.get('APP_ENV', 'production').lower()
IS_DEV = APP_ENV in ('development', 'dev', 'test', 'local')

JWT_SECRET = os.environ.get('JWT_SECRET', 'change_me')
if JWT_SECRET in ('change_me', '') and not IS_DEV:
    raise RuntimeError('FATAL: JWT_SECRET is unset or insecure; set a strong JWT_SECRET outside development/test.')
JWT_ALG = os.environ.get('JWT_ALG', 'HS256')
# User session tokens vs. admin console tokens (admin sessions are deliberately shorter).
JWT_EXPIRES_HOURS = int(os.environ.get('JWT_EXPIRES_HOURS', '24'))
ADMIN_JWT_EXPIRES_HOURS = int(os.environ.get('ADMIN_JWT_EXPIRES_HOURS', '12'))
# When on, an admin without two-factor can only reach the enrolment endpoints until they set it up.
ADMIN_REQUIRE_2FA = os.environ.get('ADMIN_REQUIRE_2FA', '').lower() in ('1', 'true', 'yes')

RESET_TOKEN_TTL_MIN = int(os.environ.get('RESET_TOKEN_TTL_MINUTES', '30'))

# OTP_EXPIRY_MINUTES is the legacy name read by otp_service; OTP_TTL_MINUTES wins when both are set.
OTP_TTL_MIN = int(os.environ.get('OTP_TTL_MINUTES') or os.environ.get('OTP_EXPIRY_MINUTES') or '10')
OTP_LENGTH = int(os.environ.get('OTP_LENGTH', '6'))

CONSULTANT_NAME = os.environ.get('CONSULTANT_NAME', 'Kiran · Senior consultant')
CONSULTANT_AUTO_REPLY = os.environ.get(
    'CONSULTANT_AUTO_REPLY',
    "Got it — I'll review and get back within 4 hours during business hours (Mon–Sat 09:00–18:00 IST)."
)

# Public site + contact details used in emails, receipts and share links.
FRONTEND_URL = (os.environ.get('FRONTEND_URL') or os.environ.get('PUBLIC_APP_URL') or 'https://wehive.co.in').rstrip('/')
SUPPORT_EMAIL = os.environ.get('SUPPORT_EMAIL', 'info@wehive.co.in')
SUPPORT_PHONE = os.environ.get('SUPPORT_PHONE', '+91 91214 95077')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@wehive.co.in')
TELEGRAM_COMMUNITY_URL = os.environ.get('TELEGRAM_COMMUNITY_URL', 'https://t.me/wehivecommunity')
# Where the admin R2 sync pulls destination images from (comma-separated base URLs, tried in order).
DESTINATION_IMAGE_BASE_URLS = [
    u.strip().rstrip('/') for u in os.environ.get(
        'DESTINATION_IMAGE_BASE_URLS',
        f'{FRONTEND_URL}/images/destinations,'
        'https://raw.githubusercontent.com/kktejas07/wehive-master/main/frontend/public/images/destinations,'
        'https://raw.githubusercontent.com/kktejas07/wehive-master/dev-fixes/frontend/public/images/destinations',
    ).split(',') if u.strip()
]

FIREBASE_PROJECT_ID = os.environ.get('FIREBASE_PROJECT_ID', '')
FIREBASE_CREDENTIALS = os.environ.get('FIREBASE_CREDENTIALS', '')

# Vector store (Qdrant)
QDRANT_URL = os.environ.get('QDRANT_URL', 'http://localhost:6333')
QDRANT_API_KEY = os.environ.get('QDRANT_API_KEY', '')

# Observability (Langfuse)
LANGFUSE_PUBLIC_KEY = os.environ.get('LANGFUSE_PUBLIC_KEY', '')
LANGFUSE_SECRET_KEY = os.environ.get('LANGFUSE_SECRET_KEY', '')
LANGFUSE_HOST = os.environ.get('LANGFUSE_HOST', 'http://localhost:3010')

# Ollama (local LLM for grading, reformulation, and prompt optimization)
OLLAMA_HOST = os.environ.get('OLLAMA_HOST', 'http://localhost:11434')
OLLAMA_GRADE_MODEL = os.environ.get('OLLAMA_GRADE_MODEL', 'llama3.2')
