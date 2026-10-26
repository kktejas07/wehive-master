from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PaymentCreate(BaseModel):
    application_id: str
    amount: float
    currency: str = 'INR'
    method: Optional[str] = None


class PaymentResponse(BaseModel):
    id: str
    application_id: str
    amount: float
    currency: str
    status: str
    created_at: datetime
