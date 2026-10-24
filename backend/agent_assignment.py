"""Which agent a new application goes to.

Only agents an admin created or approved (status active, verified, not
blacklisted) ever receive applications; the least-loaded one is picked.
"""
from typing import Optional

ASSIGNABLE = {'status': 'active', 'verified': True, 'blacklisted': {'$ne': True}}


async def pick_agent(db) -> Optional[str]:
    best = None
    for a in await db.agents.find(ASSIGNABLE, {'_id': 1}).to_list(100):
        count = await db.applications.count_documents({'agent_id': a['_id']})
        if best is None or count < best[1]:
            best = (a['_id'], count)
    return best[0] if best else None
