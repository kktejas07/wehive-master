"""Email viewmodel — send transactional emails and log them to email_log."""
import logging
import uuid
from datetime import datetime

from db import db
from email_service import send_email

logger = logging.getLogger('wehive.email_vm')
email_log = db['email_log']


async def _log(user_id: str, kind: str, subject: str, status: str = 'sent') -> None:
    try:
        await email_log.insert_one({
            '_id': str(uuid.uuid4()),
            'user_id': user_id,
            'kind': kind,
            'subject': subject,
            'status': status,
            'sent_at': datetime.utcnow(),
        })
    except Exception as e:
        logger.warning('email_log insert failed: %s', e)


async def send_document_action(user_id: str, to: str, name: str,
                                doc_name: str, action: str, reason: str = '') -> None:
    from email_templates.application_emails import document_action
    subject, html = document_action(name, doc_name, action, reason)
    await send_email(to=to, subject=subject, html=html)
    await _log(user_id, 'document_action', subject)


async def send_admin_message(user_id: str, to: str, name: str,
                              message: str, app_id: str) -> None:
    from email_templates.application_emails import admin_message_email
    subject, html = admin_message_email(name, message, app_id)
    await send_email(to=to, subject=subject, html=html)
    await _log(user_id, 'admin_message', subject)


async def send_reminder(user_id: str, to: str, name: str,
                         template: str = 'generic', note: str = '') -> None:
    from email_templates.application_emails import reminder_email
    subject, html = reminder_email(name, template, note)
    await send_email(to=to, subject=subject, html=html)
    await _log(user_id, f'reminder_{template}', subject)


async def send_suspension(user_id: str, to: str, name: str, reason: str = '') -> None:
    from email_templates.application_emails import suspension_email
    subject, html = suspension_email(name)
    await send_email(to=to, subject=subject, html=html)
    await _log(user_id, 'suspension', subject)
