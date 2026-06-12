"""WhatsApp OTP delivery via GetOTP.co RapidAPI."""
import logging
import httpx
from settings_service import get_all

logger = logging.getLogger('wehive.whatsapp_otp')


async def send_whatsapp_otp(phone: str, otp_code: str, purpose: str = 'login') -> bool:
    cfg = await get_all('getotp')
    rapidapi_key = cfg.get('rapidapi_key') or ''
    api_host = cfg.get('rapidapi_host') or ''
    api_key = cfg.get('api_key') or ''
    base_url = cfg.get('base_url') or 'https://getotp-co-send-otps-via-whatsapp-globally-for-free.p.rapidapi.com'

    if not rapidapi_key or not api_host or not api_key:
        logger.warning('GetOTP.co not fully configured — cannot send WhatsApp OTP to %s', phone)
        return False

    headers = {
        'x-rapidapi-key': rapidapi_key,
        'x-rapidapi-host': api_host,
    }

    params = {
        'key': api_key,
        'otp': otp_code,
        'to': phone,
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f'{base_url}/api', params=params, headers=headers)
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
