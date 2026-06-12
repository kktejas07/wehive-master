import os

ADMIN_EMAILS = {
    e.strip().lower()
    for e in os.environ.get('ADMIN_EMAILS', '').split(',')
    if e.strip()
}

JWT_SECRET = os.environ.get('JWT_SECRET', 'change_me')
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