"""Agent Portal AI — AI assistant for human recruitment agents.

Answers natural language queries about:
- Which students need attention (deadlines, pending docs)
- Drafting status updates for student applications
- Commission summaries and forecasts
- Comparing student profiles against successful visa patterns
- Recommending next actions for each student
"""

from datetime import datetime, timedelta
from typing import List, Optional


async def get_students_needing_attention(db, agent_id: str) -> List[dict]:
    """Find students who need agent attention."""
    students = []
    cur = db['agent_students'].find({'agent_id': agent_id}).limit(50)
    async for s in cur:
        student_id = s.get('student_id') or s.get('email', '')
        apps_cur = db['applications'].find({'user_id': student_id}).sort('created_at', -1).limit(1)
        app = await apps_cur.to_list(1)
        status = app[0].get('status', 'no_application') if app else 'no_application'
        updated = app[0].get('updated_at', datetime.utcnow()) if app else datetime.utcnow()
        days_idle = (datetime.utcnow() - updated).days if updated else 0
        students.append({
            'name': s.get('name', s.get('email', 'Unknown')),
            'email': s.get('email', ''),
            'status': status,
            'days_idle': days_idle,
            'needs_attention': days_idle > 7 or status in ('draft', 'rejected'),
        })
    return sorted(students, key=lambda x: x['days_idle'], reverse=True)


async def get_commission_summary(db, agent_id: str) -> dict:
    """Get commission summary for an agent."""
    total_earned = 0
    pending = 0
    paid = 0
    cur = db['commissions'].find({'agent_id': agent_id})
    async for c in cur:
        amt = c.get('amount', 0)
        total_earned += amt
        if c.get('status') == 'pending':
            pending += amt
        elif c.get('status') == 'paid':
            paid += amt
    return {
        'total_earned': total_earned,
        'pending': pending,
        'paid': paid,
        'unpaid_count': 0,  # would come from a real commission system
    }


async def generate_status_update(db, agent_id: str, student_email: str) -> str:
    """Generate a natural-language status update for a student's application."""
    student = await db['agent_students'].find_one({'agent_id': agent_id, 'email': student_email})
    if not student:
        return f'No student found with email {student_email}'
    apps = await db['applications'].find({'user_id': student_email}).sort('created_at', -1).to_list(3)
    if not apps:
        return f'{student.get("name", student_email)} has no applications yet.'
    lines = [f'**{student.get("name", student_email)}** — Application Summary:']
    for app in apps:
        status = app.get('status', 'draft')
        country = app.get('country_name', 'Unknown')
        visa = app.get('visa_type', 'Unknown')
        updated = app.get('updated_at', datetime.utcnow())
        lines.append(f'  • **{country}** ({visa}) — **{status.replace("_", " ").title()}** (last updated {updated.strftime("%d %b")})')
    return '\n'.join(lines)


async def suggest_next_actions(db, agent_id: str) -> List[dict]:
    """Suggest next actions for the agent's students."""
    actions = []
    students = await get_students_needing_attention(db, agent_id)
    for s in students[:5]:
        if s['needs_attention']:
            if s['status'] == 'draft':
                actions.append({'student': s['name'], 'action': 'Follow up — application still in draft', 'priority': 'high'})
            elif s['status'] == 'rejected':
                actions.append({'student': s['name'], 'action': 'Review rejection and discuss next steps', 'priority': 'high'})
            elif s['days_idle'] > 14:
                actions.append({'student': s['name'], 'action': f'No activity for {s["days_idle"]} days — reach out', 'priority': 'medium'})
    return actions
