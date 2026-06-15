"""Unit tests for constants.py — pure enums and constants, no dependencies."""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

os.environ['MONGO_URL'] = 'mongodb://localhost:27017'
os.environ['DB_NAME'] = 'wehive_test'

from constants import AppStatus, OtpChannel, BILLABLE_STATUSES, STATUS_LABELS, REFERRAL_REWARD_INR, MIN_DEPOSIT_FOR_REWARD


class TestAppStatus:
    def test_values(self):
        assert AppStatus.DRAFT.value == 'draft'
        assert AppStatus.SUBMITTED.value == 'submitted'
        assert AppStatus.IN_REVIEW.value == 'in_review'
        assert AppStatus.APPROVED.value == 'approved'
        assert AppStatus.REJECTED.value == 'rejected'

    def test_is_str_enum(self):
        assert isinstance(AppStatus.DRAFT, str)


class TestOtpChannel:
    def test_values(self):
        assert OtpChannel.EMAIL.value == 'email'
        assert OtpChannel.PHONE.value == 'phone'
        assert OtpChannel.SMS.value == 'sms'
        assert OtpChannel.WHATSAPP.value == 'whatsapp'
        assert OtpChannel.AUTO.value == 'auto'


class TestBillableStatuses:
    def test_contains_expected(self):
        assert AppStatus.SUBMITTED in BILLABLE_STATUSES
        assert AppStatus.IN_REVIEW in BILLABLE_STATUSES
        assert AppStatus.APPROVED in BILLABLE_STATUSES

    def test_excludes_draft_and_rejected(self):
        assert AppStatus.DRAFT not in BILLABLE_STATUSES
        assert AppStatus.REJECTED not in BILLABLE_STATUSES


class TestStatusLabels:
    def test_all_statuses_have_labels(self):
        for status in AppStatus:
            assert status in STATUS_LABELS, f'{status} missing label'

    def test_labels_are_strings(self):
        for label in STATUS_LABELS.values():
            assert isinstance(label, str) and len(label) > 0


class TestConstants:
    def test_referral_reward(self):
        assert REFERRAL_REWARD_INR == 500

    def test_min_deposit(self):
        assert MIN_DEPOSIT_FOR_REWARD == 2000
