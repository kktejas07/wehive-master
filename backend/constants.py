from enum import Enum


class AppStatus(str, Enum):
    DRAFT = 'draft'
    SUBMITTED = 'submitted'
    IN_REVIEW = 'in_review'
    APPROVED = 'approved'
    REJECTED = 'rejected'


BILLABLE_STATUSES = {AppStatus.SUBMITTED, AppStatus.IN_REVIEW, AppStatus.APPROVED}
STATUS_LABELS = {
    AppStatus.SUBMITTED: 'Submitted to embassy',
    AppStatus.IN_REVIEW: 'In consular review',
    AppStatus.APPROVED: 'Visa approved',
    AppStatus.REJECTED: 'Visa rejected',
    AppStatus.DRAFT: 'Moved back to draft',
}

REFERRAL_REWARD_INR = 500
DEFAULT_AGENT_COMMISSION_RATE = 10  # percent, for newly registered partner agents

# Keyword → US visa class, for parsing slot-availability chatter (telegram_slot_reader).
US_VISA_CLASS_KEYWORDS = {
    "b1b2": ["b1", "b2", "b1/b2", "tourist", "visitor", "business visa"],
    "f1": ["f1", "f-1", "student", "student visa"],
    "h1b": ["h1b", "h1-b", "h-1b", "h1", "work visa"],
    "h4": ["h4", "h-4", "dependent"],
    "l1": ["l1", "l-1", "l1a", "l1b", "intra-company"],
    "j1": ["j1", "j-1", "exchange", "exchange visitor"],
}

# Keyword → generic visa category, sorted by specificity (local_llm intent handling).
VISA_CATEGORY_KEYWORDS = {
    "sticker": ["sticker", "traditional", "embassy", "consulate", "in-person", "appointment", "biometric"],
    "e-visa": ["e-visa", "evisa", "electronic visa", "online visa", "digital visa", "eta"],
    "on-arrival": ["on-arrival", "on arrival", "landing", "arrival visa", "visa on arrival", "voa"],
    "visa-free": ["visa-free", "visa free", "no visa", "without visa", "free entry", "visa exempt", "visa exemption"],
    "transit": ["transit", "layover", "connecting flight", "stopover", "airport transit"],
    "medical": ["medical", "health", "treatment", "medical visa"],
    "business": ["business", "corporate", "work trip", "business trip", "conference"],
    "student": ["study", "student", "university", "college", "academic"],
    "work": ["work", "employment", "job", "professional", "employee"],
    "tourist": ["tourist", "tourism", "travel", "vacation", "sightseeing"],
}
