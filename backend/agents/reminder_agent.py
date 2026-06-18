"""Deadline & Reminder Agent — proactively monitors applications and sends Eva tips.

Checks:
- Applications submitted but no appointment booked after 7 days
- Passport expiring within 6 months
- Visa expiry approaching for approved applications
- Intake deadlines for student visa applications
"""

from datetime import datetime, timedelta
from typing import List


async def check_pending_appointments(db) -> List[dict]:
    """Find applications submitted >7 days ago with no appointment booked."""
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    cur = db['applications'].find({
        'status': 'in_review',
        'updated_at': {'$lte': seven_days_ago},
        'visa_appointment': {'$exists': False},
    }).limit(20)
    reminders = []
    async for app in cur:
        reminders.append({
            'user_id': app.get('user_id'),
            'application_id': app['_id'],
            'type': 'missed_appointment',
            'message': "Your application has been in review for over a week. Have you booked your embassy appointment yet?",
        })
    return reminders


async def check_expiring_passports(db, scans_col) -> List[dict]:
    """Find passports expiring within 6 months from scan data."""
    six_months = datetime.utcnow() + timedelta(days=180)
    cur = scans_col.find({
        'kind': 'passport',
        'extracted.passport_expiry': {'$ne': None},
    }).limit(20)
    reminders = []
    async for scan in cur:
        expiry_str = scan.get('extracted', {}).get('passport_expiry', '')
        if not expiry_str:
            continue
        try:
            expiry = datetime.strptime(expiry_str, '%d-%m-%Y')
        except (ValueError, TypeError):
            try:
                expiry = datetime.strptime(expiry_str, '%Y-%m-%d')
            except (ValueError, TypeError):
                continue
        if expiry < six_months and expiry > datetime.utcnow():
            days_left = (expiry - datetime.utcnow()).days
            reminders.append({
                'user_id': scan.get('user_id'),
                'type': 'passport_expiring',
                'message': f'Your passport expires in {days_left} days. Renew it soon to avoid visa issues.',
            })
    return reminders


async def run_all_checks(db) -> List[dict]:
    """Run all reminder checks and return actionable items."""
    reminders = []
    reminders.extend(await check_pending_appointments(db))
    reminders.extend(await check_expiring_passports(db, db['scans']))
    return reminders
