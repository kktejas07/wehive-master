"""Communication services: Telegram, Discord, WhatsApp

Telegram: Send messages via bot API (free, no per-message cost)
Discord: Send notifications via webhooks (free)
WhatsApp: Send messages via Twilio (existing, per-message cost)
"""

import os
import httpx
from typing import Optional

TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_CHAT_ID = os.environ.get('TELEGRAM_CHAT_ID', '')
DISCORD_WEBHOOK_URL = os.environ.get('DISCORD_WEBHOOK_URL', '')
WHATSAPP_GROUP_INVITE_LINK = os.environ.get('WHATSAPP_GROUP_INVITE_LINK', '')


class TelegramService:
    def __init__(self, bot_token: str = TELEGRAM_BOT_TOKEN):
        self.bot_token = bot_token
        self.base_url = f'https://api.telegram.org/bot{bot_token}' if bot_token else None

    async def send_message(self, chat_id: str, text: str, parse_mode: str = 'Markdown') -> dict:
        if not self.base_url:
            return {'ok': False, 'error': 'Telegram bot token not configured'}

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
        if not self.base_url:
            return {'ok': False, 'error': 'Telegram bot token not configured'}
        async with httpx.AsyncClient() as client:
            response = await client.get(f'{self.base_url}/getUpdates', timeout=10.0)
            return response.json()


class DiscordService:
    def __init__(self, webhook_url: str = DISCORD_WEBHOOK_URL):
        self.webhook_url = webhook_url

    async def send_message(
        self,
        content: str,
        username: str = 'We Hive Bot',
        avatar_url: Optional[str] = None,
        embeds: Optional[list] = None,
    ) -> dict:
        if not self.webhook_url:
            return {'ok': False, 'error': 'Discord webhook URL not configured'}

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
                    self.webhook_url,
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
    def __init__(self, group_invite_link: str = WHATSAPP_GROUP_INVITE_LINK):
        self.group_invite_link = group_invite_link

    def get_community_invite(self) -> str:
        return self.group_invite_link or 'https://chat.whatsapp.com/invite'

    async def send_invite_message(self, phone: str, group_name: str = 'We Hive Community') -> dict:
        from otp_providers import deliver_whatsapp_message
        if not self.group_invite_link:
            return {'ok': False, 'error': 'WhatsApp group invite not configured'}

        message = (
            f"Welcome to {group_name}! 🐝\n\n"
            f"Join our community to connect with other travelers, get visa updates, and exclusive offers.\n\n"
            f"Click here to join: {self.group_invite_link}"
        )
        return await deliver_whatsapp_message(phone, message)


telegram = TelegramService()
discord = DiscordService()
whatsapp_service = WhatsAppService()