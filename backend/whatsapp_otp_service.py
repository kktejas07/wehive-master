"""WhatsApp OTP delivery via GetOTP.co RapidAPI."""
import logging
import httpx
from settings_service import get_all

logger = logging.getLogger('wehive.whatsapp_otp')

DEFAULT_MESSAGE_TEMPLATE = 'Your We Hive verification code is: {otp}. It expires in {minutes} minutes.'


async def send_whatsapp_otp(phone: str, otp_code: str, purpose: str = 'login') -> bool:
    cfg = await get_all('getotp')
    api_key = cfg.get('rapidapi_key') or ''
    api_host = cfg.get('rapidapi_host') or ''
    base_url = cfg.get('base_url') or 'https://getotp-co-send-otps-via-whatsapp-globally-for-free.p.rapidapi.com'

    if not api_key or not api_host:
        logger.warning('GetOTP.co not configured — cannot send WhatsApp OTP to %s', phone)
        return False

    message = cfg.get('message_template') or DEFAULT_MESSAGE_TEMPLATE
    message = message.replace('{otp}', otp_code).replace('{minutes}', str(cfg.get('otp_expiry_minutes', 10)))

    headers = {
        'x-rapidapi-key': api_key,
        'x-rapidapi-host': api_host,
        'Content-Type': 'application/json',
    }

    payload = {
        'phoneNumber': phone,
        'message': message,
        'otp': otp_code,
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(f'{base_url}/send', json=payload, headers=headers)
            data = resp.json()
            if resp.status_code == 200 and data.get('success'):
                logger.info('WhatsApp OTP sent to %s via GetOTP.co', phone)
                return True
            else:
                logger.warning('GetOTP.co API error: %s %s', resp.status_code, data)
                return False
    except httpx.TimeoutException:
        logger.error('GetOTP.co request timed out for %s', phone)
        return False
    except Exception as e:
        logger.exception('GetOTP.co request failed for %s: %s', phone, e)
        return False
