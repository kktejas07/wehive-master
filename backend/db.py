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
third_party_settings = db['third_party_settings']
profile_change_requests = db['profile_change_requests']
universities_col = db['universities_v2']
promotions_col = db['promotions']
agents_col = db['agents']
agent_students_col = db['agent_students']
commissions_col = db['commissions']


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
    await third_party_settings.create_index('_id')
    await db['settings'].create_index('_id')
    await profile_change_requests.create_index([('user_id', 1), ('created_at', -1)])
    await profile_change_requests.create_index([('status', 1), ('created_at', -1)])
    await universities_col.create_index([('country', 1), ('rank', 1)])
    await universities_col.create_index([('name', 'text'), ('short_name', 'text')])
    await promotions_col.create_index([('active', 1), ('position', 1)])
    await promotions_col.create_index([('expires_at', 1)], sparse=True)
    await agents_col.create_index('user_id', unique=True, sparse=True)
    await agents_col.create_index('status')
    await agent_students_col.create_index([('agent_id', 1), ('created_at', -1)])
    await agent_students_col.create_index('email', sparse=True)
    await commissions_col.create_index([('agent_id', 1), ('created_at', -1)])
    await commissions_col.create_index([('status', 1), ('created_at', -1)])
    await db['profile_change_requests'].create_index([('user_id', 1), ('created_at', -1)])
    await db['profile_change_requests'].create_index([('status', 1), ('created_at', -1)])

