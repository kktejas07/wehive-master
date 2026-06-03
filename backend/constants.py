from enum import Enum


class AppStatus(str, Enum):
    DRAFT = 'draft'
    SUBMITTED = 'submitted'
    IN_REVIEW = 'in_review'
    APPROVED = 'approved'
    REJECTED = 'rejected'


class OtpChannel(str, Enum):
    EMAIL = 'email'
    PHONE = 'phone'
    SMS = 'sms'
    WHATSAPP = 'whatsapp'
    AUTO = 'auto'


BILLABLE_STATUSES = {AppStatus.SUBMITTED, AppStatus.IN_REVIEW, AppStatus.APPROVED}
STATUS_LABELS = {
    AppStatus.SUBMITTED: 'Submitted to embassy',
    AppStatus.IN_REVIEW: 'In consular review',
    AppStatus.APPROVED: 'Visa approved',
    AppStatus.REJECTED: 'Visa rejected',
    AppStatus.DRAFT: 'Moved back to draft',
}