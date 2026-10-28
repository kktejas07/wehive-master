from pydantic import BaseModel, EmailStr
from typing import Optional, Literal
from datetime import datetime


class PublicUser(BaseModel):
    id: str
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    email_verified: bool = False
    phone_verified: bool = False
    gender: Optional[str] = None
    avatar_seed: Optional[str] = None
    avatar_style: Optional[str] = None
    is_premium: bool = False
    premium_since: Optional[datetime] = None
    plan_id: Optional[str] = None
    is_admin: bool = False
    is_staff: bool = False
    staff_role: Optional[str] = None
    notify_email: bool = True
    notify_whatsapp: bool = False
    premium_free_left: int = 0
    pending_email: Optional[str] = None
    pending_phone: Optional[str] = None
    created_at: datetime


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    gender: Optional[Literal['male', 'female', 'other']] = None
    avatar_seed: Optional[str] = None
    avatar_style: Optional[str] = None
    notify_email: Optional[bool] = None
    notify_whatsapp: Optional[bool] = None


class PushTokenBody(BaseModel):
    token: str
    platform: str = 'expo'
