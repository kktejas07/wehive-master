from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from .user import PublicUser


class SendOtpRequest(BaseModel):
    identifier: str = Field(..., description='Email or E.164 phone (e.g. +9191xxxxx)')
    channel: Literal['email', 'sms', 'whatsapp', 'phone'] = 'email'
    purpose: Literal['login', 'signup'] = 'login'

    @field_validator('identifier')
    @classmethod
    def _strip(cls, v: str) -> str:
        return v.strip()


class SendOtpResponse(BaseModel):
    sent: bool
    channel: str
    masked: str
    dev_code: Optional[str] = None
    ttl_seconds: int


class VerifyOtpRequest(BaseModel):
    identifier: str
    code: str
    channel: str = 'email'
    name: Optional[str] = None
    referral_code: Optional[str] = None


class FirebaseSyncRequest(BaseModel):
    id_token: str


class FirebasePhoneSyncRequest(BaseModel):
    id_token: str
    name: Optional[str] = None
    referral_code: Optional[str] = None


class AuthTokens(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    user: PublicUser


AuthTokens.model_rebuild()
