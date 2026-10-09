"""Admin AI Analytics Agent — generates insights from application data.

Provides:
- Trend analysis (applications over time, approval rates)
- Anomaly detection (unusual spikes in rejections, delays)
- Revenue forecasts
- Agent performance comparisons
"""

from datetime import datetime, timedelta
from typing import List


async def get_trends(db, days: int = 30) -> dict:
    """Analyze application trends over the given period."""
    if days < 1 or days > 365:
        days = 30
    since = datetime.utcnow() - timedelta(days=days)
    total = await db['applications'].count_documents({'created_at': {'$gte': since}})
    approved = await db['applications'].count_documents({'status': 'approved', 'created_at': {'$gte': since}})
    rejected = await db['applications'].count_documents({'status': 'rejected', 'created_at': {'$gte': since}})
    in_review = await db['applications'].count_documents({'status': 'in_review', 'created_at': {'$gte': since}})
    approval_rate = round((approved / total * 100), 1) if total else 0
    return {
        'period_days': days,
        'total_applications': total,
        'approved': approved,
        'rejected': rejected,
        'in_review': in_review,
        'approval_rate_pct': approval_rate,
        'rejection_rate_pct': round((rejected / total * 100), 1) if total else 0,
    }


async def get_revenue_summary(db, days: int = 30) -> dict:
    """Summarize revenue from payments over the period."""
    since = datetime.utcnow() - timedelta(days=days)
    cursor = db['payments'].find({'status': 'paid', 'created_at': {'$gte': since}})
    total_revenue = 0
    plan_breakdown = {'lite': 0, 'standard': 0, 'concierge': 0}
    count = 0
    async for p in cursor:
        amt = p.get('amount_inr', p.get('amount_usd', 0))
        total_revenue += amt
        pid = p.get('plan_id', '')
        if pid in plan_breakdown:
            plan_breakdown[pid] += 1
        count += 1
    return {
        'period_days': days,
        'total_revenue_usd': total_revenue,
        'total_payments': count,
        'plan_breakdown': plan_breakdown,
        'avg_revenue_per_day': round(total_revenue / days, 2) if days else 0,
    }


async def get_agent_performance(db) -> List[dict]:
    """Compare agent performance metrics."""
    agents = []
    cur = db['agents'].find({'status': 'active'}).limit(20)
    async for a in cur:
        app_count = a.get('applications_count', 0)
        students = await db['agent_students'].count_documents({'agent_id': a['_id']})
        agents.append({
            'agent_id': a['_id'],
            'name': a.get('name', 'Unknown'),
            'students_count': students,
            'applications_count': app_count,
            'total_revenue': a.get('total_revenue', 0),
            'tier': a.get('tier', 'bronze'),
        })
    return sorted(agents, key=lambda x: x['applications_count'], reverse=True)


async def get_anomalies(db) -> List[dict]:
    """Detect anomalies: unusual rejection spikes, stalled applications."""
    anomalies = []

    # High rejection rate in last 7 days
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent = await db['applications'].count_documents({'created_at': {'$gte': week_ago}})
    if recent > 0:
        rejected = await db['applications'].count_documents({'status': 'rejected', 'created_at': {'$gte': week_ago}})
        reject_rate = rejected / recent
        if reject_rate > 0.5:
            anomalies.append({
                'type': 'high_rejection_rate',
                'severity': 'warning',
                'message': f'Rejection rate is {reject_rate:.0%} in the last 7 days ({rejected}/{recent})',
            })

    # Stalled applications (submitted >14 days, no appointment)
    fourteen_days = datetime.utcnow() - timedelta(days=14)
    stalled = await db['applications'].count_documents({
        'status': 'in_review',
        'updated_at': {'$lte': fourteen_days},
        '$or': [
            {'visa_appointment': {'$exists': False}},
            {'visa_appointment': None},
        ],
    })
    if stalled > 5:
        anomalies.append({
            'type': 'stalled_applications',
            'severity': 'info',
            'message': f'{stalled} applications stalled without appointments for over 14 days',
        })

    return anomalies


async def llm_anomaly_insight(anomalies: list) -> str:
    """Use LLM to generate actionable insights from detected anomalies."""
    if not anomalies:
        return "No anomalies detected. System is healthy."

    anomaly_text = "\n".join(f"- {a.get('type','')}: {a.get('message','')}" for a in anomalies)
    try:
        from model_router import chat_with_profile
        response = await chat_with_profile(
            "fast_cheap",
            [
                {"role": "system", "content": (
                    "You are an analytics expert for a visa platform. Given detected anomalies, "
                    "provide a concise 2-sentence insight on root cause and recommended action."
                )},
                {"role": "user", "content": f"Anomalies:\n{anomaly_text}"},
            ],
            max_tokens=150,
        )
        return response.get("content", "Review anomalies manually.").strip()
    except Exception:
        return f"Detected anomalies: {anomaly_text[:200]}"
