from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
import uuid


def _uuid() -> str:
    return str(uuid.uuid4())


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


class LeadCreate(BaseModel):
    name: str
    surname: Optional[str] = ''
    email: EmailStr
    message: str
