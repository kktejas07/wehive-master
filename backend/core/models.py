from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Literal
from datetime import datetime
import uuid


def _uuid() -> str:
    return str(uuid.uuid4())


# ----- Auth ----- #
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
    user: 'PublicUser'


# ----- User ----- #
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
    is_admin: bool = False
    is_staff: bool = False
    staff_role: Optional[str] = None
    created_at: datetime


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    gender: Optional[Literal['male', 'female', 'other']] = None
    avatar_seed: Optional[str] = None
    avatar_style: Optional[str] = None


# ----- Applications ----- #
class PrimaryApplicant(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class ApplicationCreate(BaseModel):
    country_id: str
    visa_type: str
    travel_date: Optional[str] = None
    applicants: int = 1
    primary_applicant: Optional[PrimaryApplicant] = None
    notes: Optional[str] = None


class Application(BaseModel):
    id: str = Field(default_factory=_uuid)
    user_id: str
    country_id: str
    visa_type: str
    travel_date: Optional[str] = None
    status: Literal['draft', 'submitted', 'in_review', 'approved', 'rejected'] = 'draft'
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ----- Holiday plan ----- #
class SavedPlanCreate(BaseModel):
    country_id: str
    duration_days: int = 7
    travel_date: Optional[str] = None


class SavedPlan(BaseModel):
    id: str = Field(default_factory=_uuid)
    user_id: str
    country_id: str
    duration_days: int
    travel_date: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ----- Leads / Contact ----- #
class LeadCreate(BaseModel):
    name: str
    surname: Optional[str] = ''
    email: EmailStr
    message: str


class Lead(BaseModel):
    id: str = Field(default_factory=_uuid)
    name: str
    surname: Optional[str] = ''
    email: str
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UniversitySelection(BaseModel):
    university_id: str
    program_id: Optional[str] = None

class UniversityApplicationCreate(BaseModel):
    universities: List[UniversitySelection]
    country_id: str
    visa_type: str = 'Student'
    travel_date: Optional[str] = None
    primary_applicant: Optional[PrimaryApplicant] = None


AuthTokens.model_rebuild()

# ----- Global Events ----- #
class GlobalEventCreate(BaseModel):
    name: str
    country_id: str
    date: str
    category: str
    image_url: Optional[str] = None
    is_high_risk: bool = False

class GlobalEvent(BaseModel):
    id: str = Field(default_factory=_uuid)
    name: str
    country_id: str
    date: str
    category: str
    image_url: Optional[str] = None
    status: Literal['pending', 'approved', 'rejected'] = 'pending'
    is_high_risk: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
