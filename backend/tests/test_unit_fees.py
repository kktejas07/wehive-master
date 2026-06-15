"""Unit tests for fee_calculator.py — pure fee logic, no DB or server needed."""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

os.environ['MONGO_URL'] = 'mongodb://localhost:27017'
os.environ['DB_NAME'] = 'wehive_test'

from fee_calculator import (
    compute_fees, compute_multi_university_fees, base_fee_for,
    FLAT_APPLICATION_FEE_INR, DEFAULT_BASE_FEE_BY_TYPE,
    DEFAULT_SURCHARGE_INR, DEFAULT_GST_RATE,
)


class TestBaseFeeFor:
    def test_known_type(self):
        assert base_fee_for('Tourist') == 3500
        assert base_fee_for('Business') == 4500
        assert base_fee_for('Student') == 5500

    def test_unknown_type_uses_fallback(self):
        assert base_fee_for('Unknown') == 3500

    def test_custom_fallback(self):
        assert base_fee_for('Unknown', 5000) == 5000


class TestComputeFees:
    def test_basic_tourist(self):
        fees = compute_fees(applicants=1, visa_type='Tourist')
        assert fees['base'] == 3500
        assert fees['applicants'] == 1
        assert fees['is_visa_free'] is True
        assert fees['surcharge'] == 0
        assert fees['total'] > 0

    def test_single_applicant_no_surcharge(self):
        fees = compute_fees(applicants=1, visa_type='Business')
        assert fees['surcharge'] == 0
        assert fees['base'] == 4500

    def test_multiple_applicants_adds_surcharge(self):
        fees = compute_fees(applicants=3, visa_type='Tourist')
        assert fees['surcharge'] == (3 - 1) * DEFAULT_SURCHARGE_INR
        assert fees['applicants'] == 3
        assert fees['base'] == 3500 * 3

    def test_govt_fee_included(self):
        fees = compute_fees(applicants=1, visa_type='Tourist', govt_fee_inr=2000)
        assert fees['govt'] == 2000
        assert fees['is_visa_free'] is False

    def test_appointment_fee(self):
        fees = compute_fees(applicants=1, visa_type='Tourist', requires_appointment=True, appointment_fee_inr=1500)
        assert fees['appointment'] == 1500
        assert fees['requires_appointment'] is True

    def test_custom_pricing_override(self):
        fees = compute_fees(applicants=1, visa_type='Tourist', base_fees_override={'Tourist': 5000})
        assert fees['base'] == 5000

    def test_gst_calculation(self):
        fees = compute_fees(applicants=1, visa_type='Tourist', gst_rate=0.18)
        assert fees['gst_on_service'] == round(3500 * 0.18)
        assert fees['gst'] == fees['gst_on_service']

    def test_all_fields_present(self):
        fees = compute_fees(applicants=2, visa_type='Student', govt_fee_inr=1000)
        expected_keys = {'govt', 'base', 'application', 'appointment',
                         'requires_appointment', 'is_visa_free', 'surcharge',
                         'gst_on_service', 'gst', 'total', 'applicants'}
        assert set(fees.keys()) == expected_keys


class TestMultiUniversityFees:
    def test_one_to_three_universities(self):
        fees = compute_multi_university_fees(2)
        assert fees['application_fee'] == FLAT_APPLICATION_FEE_INR
        assert fees['university_count'] == 2

    def test_four_or_more_universities(self):
        fees = compute_multi_university_fees(5)
        expected = FLAT_APPLICATION_FEE_INR + (5 - 3) * 3000
        assert fees['application_fee'] == expected
        assert fees['university_count'] == 5

    def test_minimum_one(self):
        fees = compute_multi_university_fees(0)
        assert fees['university_count'] == 1
        assert fees['application_fee'] == FLAT_APPLICATION_FEE_INR

    def test_gst_included(self):
        fees = compute_multi_university_fees(2)
        expected_gst = round(FLAT_APPLICATION_FEE_INR * DEFAULT_GST_RATE)
        assert fees['gst'] == expected_gst
        assert fees['total'] == fees['application_fee'] + fees['gst']


class TestFLATApplicationFee:
    def test_constant_is_defined(self):
        assert FLAT_APPLICATION_FEE_INR == 20000
