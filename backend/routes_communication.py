"""Communication routes: Telegram, Discord, WhatsApp community invites"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from auth_utils import get_current_user
from communication_services import telegram, discord, whatsapp_service
from db import users

router = APIRouter(prefix='/communication', tags=['communication'])


class TelegramLinkRequest(BaseModel):
    telegram_username: str


class TelegramOtpRequest(BaseModel):
    code: str
    purpose: str = 'login'


class NotificationRequest(BaseModel):
    title: str
    description: str
    type: str = 'info'


@router.post('/telegram/link')
async def link_telegram(req: TelegramLinkRequest, user=Depends(get_current_user)):
    username = req.telegram_username.strip().lstrip('@')
    if not username:
        raise HTTPException(status_code=400, detail='Invalid Telegram username')

    await users.update_one(
        {'_id': user['_id']},
        {'$set': {'telegram_username': username}}
    )
    return {'ok': True, 'message': f'Linked @{username}'}


@router.post('/telegram/send-code')
async def send_telegram_code(code: str, user=Depends(get_current_user)):
    if not user.get('telegram_username'):
        raise HTTPException(status_code=400, detail='Telegram not linked')

    result = await telegram.send_otp_code(
        chat_id=f'@{user["telegram_username"]}',
        code=code,
        purpose='verification'
    )
    if result.get('ok'):
        return {'ok': True, 'channel': 'telegram'}
    raise HTTPException(status_code=502, detail='Failed to send via Telegram')


@router.get('/telegram/verify-setup')
async def verify_telegram_setup(user=Depends(get_current_user)):
    linked = bool(user.get('telegram_username'))
    bot_configured = bool(telegram.base_url)
    return {
        'linked': linked,
        'bot_configured': bot_configured,
        'username': user.get('telegram_username') if linked else None,
    }


@router.post('/discord/notify')
async def send_discord_notification(
    req: NotificationRequest,
    user=Depends(get_current_user),
):
    if not discord.webhook_url:
        raise HTTPException(status_code=503, detail='Discord not configured')

    result = await discord.send_notification(
        title=req.title,
        description=req.description,
    )
    if result.get('ok'):
        return {'ok': True}
    raise HTTPException(status_code=502, detail='Failed to send Discord notification')


@router.get('/community/join')
async def get_community_invite(user=Depends(get_current_user)):
    invite_link = whatsapp_service.get_community_invite()
    return {
        'whatsapp': invite_link,
        'telegram_group': 'https://t.me/wehivecommunity',
    }


@router.post('/community/invite')
async def send_community_invite(
    channel: str,
    user=Depends(get_current_user),
):
    user_contact = user.get('phone') or user.get('email')
    if not user_contact:
        raise HTTPException(status_code=400, detail='No contact info on file')

    if channel == 'whatsapp':
        result = await whatsapp_service.send_invite_message(user_contact)
        if result.get('ok'):
            return {'ok': True, 'channel': 'whatsapp'}
        raise HTTPException(status_code=502, detail='Failed to send WhatsApp invite')

    if channel == 'telegram':
        if not user.get('telegram_username'):
            raise HTTPException(status_code=400, detail='Telegram not linked')
        result = await telegram.send_message(
            chat_id=f'@{user["telegram_username"]}',
            text=(
                "Welcome to We Hive Community! 🐝\n\n"
                "Click here to join our Telegram group: https://t.me/wehivecommunity"
            )
        )
        if result.get('ok'):
            return {'ok': True, 'channel': 'telegram'}
        raise HTTPException(status_code=502, detail='Failed to send Telegram invite')

    raise HTTPException(status_code=400, detail='Invalid channel')