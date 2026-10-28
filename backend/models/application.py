from pydantic import BaseModel, Field
from typing import Optional, Literal, List
from datetime import datetime
import uuid


def _uuid() -> str:
    return str(uuid.uuid4())


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


class UniversitySelection(BaseModel):
    university_id: str
    program_id: Optional[str] = None


class UniversityApplicationCreate(BaseModel):
    universities: List[UniversitySelection]
    country_id: str
    visa_type: str = 'Student'
    travel_date: Optional[str] = None
    primary_applicant: Optional[PrimaryApplicant] = None
