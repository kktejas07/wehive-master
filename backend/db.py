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


async def ensure_indexes():
    await users.create_index('email', unique=True, sparse=True)
    await users.create_index('phone', unique=True, sparse=True)
    await otps.create_index([('identifier', 1), ('channel', 1)])
    await otps.create_index('expires_at', expireAfterSeconds=0)
    await applications.create_index('user_id')
    await holiday_plans.create_index('user_id')
