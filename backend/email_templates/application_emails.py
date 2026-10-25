"""Transactional email HTML templates for admin-triggered notifications."""
from config import FRONTEND_URL

_WRAP = """\
<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{{margin:0;padding:0;background:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}}
  .card{{max-width:540px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}}
  .hdr{{background:linear-gradient(135deg,#1B2B5E 0%,#2d4a9e 100%);padding:28px 32px;text-align:center}}
  .hdr h1{{color:#fff;margin:0;font-size:20px;font-weight:700}}
  .hdr p{{color:rgba(255,255,255,.75);margin:6px 0 0;font-size:13px}}
  .body{{padding:28px 32px;color:#1e293b;font-size:14px;line-height:1.7}}
  .badge{{display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600}}
  .cta{{display:block;margin:24px auto 0;width:fit-content;padding:12px 28px;background:#1B2B5E;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600}}
  .footer{{padding:16px 32px 24px;text-align:center;font-size:11px;color:#94a3b8}}
</style></head>
<body><div class="card">
<div class="hdr"><h1>We Hive</h1><p>{subheading}</p></div>
<div class="body">{body}</div>
<div class="footer">&copy; 2026 We Hive &middot; <a href="{site}/help" style="color:#94a3b8">Help</a></div>
</div></body></html>
"""


def _wrap(subheading: str, body: str) -> str:
    return _WRAP.format(subheading=subheading, body=body, site=FRONTEND_URL)


def document_action(name: str, doc_name: str, action: str, reason: str = '') -> tuple[str, str]:
    color = {'approved': '#22c55e', 'rejected': '#ef4444', 'reupload_requested': '#f59e0b'}.get(action, '#64748b')
    label = {'approved': 'Approved', 'rejected': 'Rejected', 'reupload_requested': 'Re-upload Required'}.get(action, action)
    reason_html = f'<p style="margin:12px 0 0"><strong>Note:</strong> {reason}</p>' if reason else ''
    body = (f'<p>Hi {name},</p>'
            f'<p>Your document <strong>{doc_name}</strong> has been reviewed:</p>'
            f'<p><span class="badge" style="background:{color}1a;color:{color}">{label}</span></p>'
            f'{reason_html}'
            f'<a class="cta" href="{FRONTEND_URL}/account/applications">View your application</a>')
    return f'Document update: {label}', _wrap('Your document has been reviewed', body)


def admin_message_email(name: str, message: str, app_id: str) -> tuple[str, str]:
    body = (f'<p>Hi {name},</p>'
            f'<p>Your consultant has sent you a message:</p>'
            f'<blockquote style="border-left:3px solid #1B2B5E;margin:16px 0;padding:12px 16px;background:#f8fafc;border-radius:0 8px 8px 0;font-style:italic">{message}</blockquote>'
            f'<a class="cta" href="{FRONTEND_URL}/account/applications/{app_id}">Reply in your dashboard</a>')
    return 'New message from your consultant', _wrap('New message from We Hive', body)


def reminder_email(name: str, template: str, note: str = '') -> tuple[str, str]:
    messages = {
        'generic': ('We noticed you have not logged in for a while. Your visa journey is waiting!', 'Continue your application'),
        'docs_pending': ('You have documents pending upload. Please complete them to move your application forward.', 'Upload documents now'),
        'payment_pending': ('Your application is ready — just one step left: complete your payment to submit.', 'Complete payment'),
    }
    text, cta_label = messages.get(template, messages['generic'])
    note_html = f'<p style="margin:12px 0 0;font-style:italic">{note}</p>' if note else ''
    body = (f'<p>Hi {name},</p>'
            f'<p>{text}</p>'
            f'{note_html}'
            f'<a class="cta" href="{FRONTEND_URL}/account/applications">{cta_label}</a>')
    return 'A gentle reminder from We Hive', _wrap('We miss you!', body)


def suspension_email(name: str) -> tuple[str, str]:
    body = (f'<p>Hi {name},</p>'
            f'<p>Your We Hive account has been temporarily suspended. If you believe this is a mistake, '
            f'please contact our support team.</p>'
            f'<a class="cta" href="{FRONTEND_URL}/help">Contact support</a>')
    return 'Your We Hive account has been suspended', _wrap('Account suspended', body)
