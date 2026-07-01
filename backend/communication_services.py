"""Communication services: Telegram, Discord, WhatsApp
 
Config is loaded from DB `notifications` settings namespace first, falling
back to env vars.  This lets admins configure via the dashboard without
server restart.
 
Telegram: Send messages via bot API (free, no per-message cost)
Discord: Send notifications via webhooks (free)
WhatsApp: Send messages via OpenWA (primary) or Twilio (fallback)
"""

import logging
from typing import Optional

import httpx

from settings_service import get_notification_config

logger = logging.getLogger('wehive.communication')


async def _load_notif(key: str, env_var: str = '', default: str = '') -> str:
    """Load a value from DB notifications config, falling back to env var, then default."""
    import os
    cfg = await get_notification_config()
    return cfg.get(key) or os.environ.get(env_var, default)


class TelegramService:
    def __init__(self, bot_token: Optional[str] = None):
        self._bot_token = bot_token

    async def _ensure_token(self):
        if self._bot_token is None:
            self._bot_token = await _load_notif('telegram_bot_token', 'TELEGRAM_BOT_TOKEN')
        self.base_url = f'https://api.telegram.org/bot{self._bot_token}' if self._bot_token else None

    async def send_message(self, chat_id: str, text: str, parse_mode: str = 'Markdown') -> dict:
        await self._ensure_token()
        if not self.base_url:
            return {'ok': False, 'error': 'Telegram bot token not configured — set in Admin → Settings → Notifications'}

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f'{self.base_url}/sendMessage',
                    json={
                        'chat_id': chat_id,
                        'text': text,
                        'parse_mode': parse_mode,
                        'disable_web_page_preview': True,
                    },
                    timeout=10.0,
                )
                return response.json()
            except Exception as e:
                return {'ok': False, 'error': str(e)}

    async def send_otp_code(self, chat_id: str, code: str, purpose: str = 'login') -> dict:
        message = (
            f"*We Hive Verification Code*\n\n"
            f"Your verification code is: *{code}*\n\n"
            f"Purpose: {purpose}\n"
            f"Valid for 10 minutes.\n\n"
            f"If you didn't request this, please ignore."
        )
        return await self.send_message(chat_id, message)

    async def get_updates(self) -> dict:
        await self._ensure_token()
        if not self.base_url:
            return {'ok': False, 'error': 'Telegram bot token not configured'}
        async with httpx.AsyncClient() as client:
            response = await client.get(f'{self.base_url}/getUpdates', timeout=10.0)
            return response.json()


class DiscordService:
    def __init__(self, webhook_url: Optional[str] = None):
        self._webhook_url = webhook_url

    async def _ensure_url(self):
        if self._webhook_url is None:
            self._webhook_url = await _load_notif('discord_webhook_url', 'DISCORD_WEBHOOK_URL')

    async def send_message(
        self,
        content: str,
        username: str = 'We Hive Bot',
        avatar_url: Optional[str] = None,
        embeds: Optional[list] = None,
    ) -> dict:
        await self._ensure_url()
        if not self._webhook_url:
            return {'ok': False, 'error': 'Discord webhook URL not configured — set in Admin → Settings → Notifications'}

        payload = {
            'content': content,
            'username': username,
        }
        if avatar_url:
            payload['avatar_url'] = avatar_url
        if embeds:
            payload['embeds'] = embeds

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self._webhook_url,
                    json=payload,
                    timeout=10.0,
                )
                if response.status_code == 204:
                    return {'ok': True}
                return {'ok': False, 'error': f'Status {response.status_code}'}
            except Exception as e:
                return {'ok': False, 'error': str(e)}

    async def send_notification(
        self,
        title: str,
        description: str,
        color: int = 0x3B82F6,
        fields: Optional[list] = None,
    ) -> dict:
        embed = {
            'title': title,
            'description': description,
            'color': color,
        }
        if fields:
            embed['fields'] = fields
        return await self.send_message(content='', embeds=[embed])

    async def send_application_update(self, user_name: str, application_id: str, status: str, message: str) -> dict:
        color_map = {
            'submitted': 0x3B82F6,
            'in_review': 0xF59E0B,
            'approved': 0x10B981,
            'rejected': 0xEF4444,
        }
        embed = {
            'title': f'Application Update: {status.title()}',
            'description': message,
            'color': color_map.get(status, 0x3B82F6),
            'fields': [
                {'name': 'User', 'value': user_name, 'inline': True},
                {'name': 'Application ID', 'value': application_id, 'inline': True},
                {'name': 'Status', 'value': status.title(), 'inline': True},
            ],
        }
        return await self.send_message(content='', embeds=[embed])


class WhatsAppService:
    def __init__(self, group_invite_link: Optional[str] = None):
        self._group_invite_link = group_invite_link

    async def _ensure_link(self):
        if self._group_invite_link is None:
            self._group_invite_link = await _load_notif('whatsapp_group_invite_link', 'WHATSAPP_GROUP_INVITE_LINK')

    async def get_community_invite(self) -> str:
        await self._ensure_link()
        return self._group_invite_link or 'https://chat.whatsapp.com/invite'

    async def send_invite_message(self, phone: str, group_name: str = 'We Hive Community') -> dict:
        await self._ensure_link()
        from otp_providers import deliver_whatsapp_message
        if not self._group_invite_link:
            return {'ok': False, 'error': 'WhatsApp group invite not configured — set in Admin → Settings → Notifications'}

        message = (
            f"Welcome to {group_name}! \U0001f41d\n\n"
            f"Join our community to connect with other travelers, get visa updates, and exclusive offers.\n\n"
            f"Click here to join: {self._group_invite_link}"
        )
        return await deliver_whatsapp_message(phone, message)


telegram = TelegramService()
discord = DiscordService()
whatsapp_service = WhatsAppService()
