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
JWT_EXPIRES_HOURS = int(os.environ.get('JWT_EXPIRES_HOURS', '720'))

RESET_TOKEN_TTL_MIN = int(os.environ.get('RESET_TOKEN_TTL_MINUTES', '30'))

OTP_TTL_MIN = int(os.environ.get('OTP_TTL_MINUTES', '10'))

CONSULTANT_NAME = os.environ.get('CONSULTANT_NAME', 'Kiran · Senior consultant')
CONSULTANT_AUTO_REPLY = os.environ.get(
    'CONSULTANT_AUTO_REPLY',
    "Got it — I'll review and get back within 4 hours during business hours (Mon–Sat 09:00–18:00 IST)."
)

FIREBASE_PROJECT_ID = os.environ.get('FIREBASE_PROJECT_ID', '')
FIREBASE_CREDENTIALS = os.environ.get('FIREBASE_CREDENTIALS', '')
SECRET_KEY = JWT_SECRET
ACCESS_TOKEN_EXPIRE = JWT_EXPIRES_HOURS