import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ.get('DB_NAME', 'wehive')

client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=5000)
db = client[DB_NAME]

# Collections
users = db['users']
otps = db['otps']
applications = db['applications']
holiday_plans = db['holiday_plans']
leads = db['leads']
countries_v2 = db['countries_v2']
flights_cache = db['flights_cache']
scans = db['scans']
payments = db['payments']
notifications_col = db['notifications']
referrals_col = db['referrals']
ai_settings = db['ai_settings']


async def ensure_indexes():
    await users.create_index('email', unique=True, sparse=True)
    await users.create_index('phone', unique=True, sparse=True)
    await otps.create_index([('identifier', 1), ('channel', 1)])
    await otps.create_index('expires_at', expireAfterSeconds=0)
    await applications.create_index('user_id')
    await holiday_plans.create_index('user_id')
    await scans.create_index([('user_id', 1), ('created_at', -1)])
    await payments.create_index([('user_id', 1)])
    await payments.create_index([('razorpay_order_id', 1)], sparse=True)
    await notifications_col.create_index([('user_id', 1), ('created_at', -1)])
    await referrals_col.create_index('user_id')
    await referrals_col.create_index('code', unique=True)
    await db['referral_transactions'].create_index('referrer_id')
    await db['referral_transactions'].create_index('referred_id')
    await db['admin_audit'].create_index([('at', -1)])
    await db['admin_audit'].create_index([('entity_type', 1), ('at', -1)])
    # Admin auth support
    await db['password_reset_tokens'].create_index('token_hash')
    await db['password_reset_tokens'].create_index('expires_at', expireAfterSeconds=0)
    await db['login_attempts'].create_index('last_attempt_at', expireAfterSeconds=60 * 60)
    await ai_settings.create_index('user_id')
