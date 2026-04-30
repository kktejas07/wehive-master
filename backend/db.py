import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ.get('DB_NAME', 'wehive')

client = AsyncIOMotorClient(MONGO_URL)
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


async def ensure_indexes():
    await users.create_index('email', unique=True, sparse=True)
    await users.create_index('phone', unique=True, sparse=True)
    await otps.create_index([('identifier', 1), ('channel', 1)])
    await otps.create_index('expires_at', expireAfterSeconds=0)
    await applications.create_index('user_id')
    await holiday_plans.create_index('user_id')
    await scans.create_index([('user_id', 1), ('created_at', -1)])
    # Admin auth support
    await db['password_reset_tokens'].create_index('token_hash')
    await db['password_reset_tokens'].create_index('expires_at', expireAfterSeconds=0)
    await db['login_attempts'].create_index('last_attempt_at', expireAfterSeconds=60 * 60)
