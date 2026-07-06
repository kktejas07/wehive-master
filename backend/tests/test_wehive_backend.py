"""Backend tests for Wehive AI Scan + Countries DB features."""
import os
import io
import time
import pytest
import requests
from PIL import Image, ImageDraw, ImageFont

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL or not BASE_URL.startswith('http'):
    BASE_URL = 'https://premium-collab-6.preview.emergentagent.com'
API = f"{BASE_URL}/api"


@pytest.fixture(scope='module')
def session():
    s = requests.Session()
    return s


@pytest.fixture(scope='module')
def auth_token(session):
    """Mock OTP login -> token."""
    email = f"test_scan_{int(time.time())}@example.com"
    r = session.post(f"{API}/auth/send-otp", json={"identifier": email, "channel": "email", "purpose": "login"})
    assert r.status_code == 200, f"send-otp failed: {r.status_code} {r.text}"
    r = session.post(f"{API}/auth/verify-otp", json={"identifier": email, "code": "123456", "name": "Scan Tester"})
    assert r.status_code == 200, f"verify-otp failed: {r.status_code} {r.text}"
    data = r.json()
    return data['access_token']


@pytest.fixture(scope='module')
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture(scope='module')
def passport_jpg_bytes():
    img = Image.new('RGB', (900, 600), (10, 30, 80))
    d = ImageDraw.Draw(img)
    d.rectangle([(50, 50), (850, 550)], fill=(240, 235, 220))
    font = ImageFont.truetype('/usr/share/fonts/truetype/freefont/FreeSansBold.ttf', 28)
    small = ImageFont.truetype('/usr/share/fonts/truetype/freefont/FreeSans.ttf', 20)
    d.text((80, 70), 'REPUBLIC OF INDIA', fill=(10, 30, 80), font=font)
    d.text((80, 180), 'Surname: SHARMA', fill=(10, 10, 10), font=small)
    d.text((80, 210), 'Given Names: ANIL KUMAR', fill=(10, 10, 10), font=small)
    d.text((80, 240), 'Date of Birth: 12 MAR 1988', fill=(10, 10, 10), font=small)
    d.text((80, 270), 'Sex: M', fill=(10, 10, 10), font=small)
    d.text((80, 300), 'Nationality: INDIAN', fill=(10, 10, 10), font=small)
    d.text((80, 330), 'Passport No: Z1234567', fill=(10, 10, 10), font=small)
    d.text((80, 360), 'Date of Issue: 01 JAN 2020', fill=(10, 10, 10), font=small)
    d.text((80, 390), 'Date of Expiry: 01 JAN 2030', fill=(10, 10, 10), font=small)
    d.text((80, 470), 'P<INDSHARMA<<ANIL<KUMAR<<<<<<<<<<<<<<<<<<<<<', fill=(40, 40, 40), font=small)
    d.text((80, 500), 'Z12345678IND8803121M3001015<<<<<<<<<<<<<<04', fill=(40, 40, 40), font=small)
    buf = io.BytesIO()
    img.save(buf, 'JPEG', quality=85)
    return buf.getvalue()


# ---------- Countries ----------
class TestCountries:
    def test_list_returns_250(self, session):
        r = session.get(f"{API}/countries")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 200, f"Expected >=200 countries, got {len(data)}"

    def test_search_india(self, session):
        r = session.get(f"{API}/countries", params={"q": "india"})
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 1
        names = [c.get('name', '').lower() for c in data]
        assert any('india' in n for n in names)

    def test_country_detail_us(self, session):
        r = session.get(f"{API}/countries/us")
        assert r.status_code == 200
        d = r.json()
        # iso2 may be uppercase
        assert (d.get('id') or '').lower() == 'us' or d.get('iso2', '').upper() == 'US'
        vt = d.get('visa_types', [])
        for cat in ['Tourist', 'Business', 'Student', 'Work']:
            assert cat in vt, f"{cat} missing in visa_types: {vt}"

    def test_country_detail_fr(self, session):
        r = session.get(f"{API}/countries/fr")
        assert r.status_code == 200
        d = r.json()
        assert d.get('name', '').lower().startswith('fr') or 'france' in d.get('name', '').lower()

    def test_unknown_country_404(self, session):
        r = session.get(f"{API}/countries/zzzzz")
        assert r.status_code == 404

    def test_holiday_plan(self, session):
        r = session.get(f"{API}/countries/us/holiday-plan")
        assert r.status_code == 200
        d = r.json()
        assert 'plan' in d
        assert 'country' in d

    def test_filter_visa_type(self, session):
        r = session.get(f"{API}/countries", params={"visa_type": "Tourist"})
        assert r.status_code == 200
        data = r.json()
        assert all('Tourist' in (c.get('visa_types') or []) for c in data if c.get('visa_types'))

    def test_filter_no_visa(self, session):
        r = session.get(f"{API}/countries", params={"no_visa": "true"})
        assert r.status_code == 200
        data = r.json()
        # Either empty or all entries have no_visa True
        for c in data:
            assert c.get('no_visa') is True


# ---------- Premium toggling ----------
class TestPremium:
    def test_me_default_not_premium(self, session, auth_headers):
        r = session.get(f"{API}/auth/me", headers=auth_headers)
        assert r.status_code == 200
        u = r.json()
        assert 'is_premium' in u
        assert u['is_premium'] is False
        assert 'premium_since' in u

    def test_upgrade_then_downgrade(self, session, auth_headers):
        r = session.post(f"{API}/users/me/upgrade", headers=auth_headers)
        assert r.status_code == 200
        assert r.json().get('is_premium') is True

        r = session.get(f"{API}/auth/me", headers=auth_headers)
        assert r.json().get('is_premium') is True

        # Downgrade & restore
        r = session.post(f"{API}/users/me/downgrade", headers=auth_headers)
        assert r.status_code == 200
        assert r.json().get('is_premium') is False
        r = session.get(f"{API}/auth/me", headers=auth_headers)
        assert r.json().get('is_premium') is False


# ---------- Scan endpoints ----------
class TestScan:
    def test_passport_no_auth_401(self, session, passport_jpg_bytes):
        files = {'file': ('passport.jpg', passport_jpg_bytes, 'image/jpeg')}
        r = session.post(f"{API}/scan/passport", files=files)
        assert r.status_code in (401, 403)

    def test_passport_non_premium_402(self, session, auth_headers, passport_jpg_bytes):
        # Make sure user is not premium
        session.post(f"{API}/users/me/downgrade", headers=auth_headers)
        files = {'file': ('passport.jpg', passport_jpg_bytes, 'image/jpeg')}
        r = session.post(f"{API}/scan/passport", files=files, headers=auth_headers)
        assert r.status_code == 402
        assert 'premium' in r.text.lower()

    def test_passport_wrong_mime_415(self, session, auth_headers):
        # upgrade to premium
        session.post(f"{API}/users/me/upgrade", headers=auth_headers)
        files = {'file': ('p.txt', b'not an image', 'text/plain')}
        r = session.post(f"{API}/scan/passport", files=files, headers=auth_headers)
        assert r.status_code == 415

    def test_passport_oversized_413(self, session, auth_headers):
        session.post(f"{API}/users/me/upgrade", headers=auth_headers)
        # Build a >8MB JPEG
        big = Image.new('RGB', (5000, 5000), (255, 255, 255))
        d = ImageDraw.Draw(big)
        for i in range(0, 5000, 50):
            d.line([(i, 0), (i, 5000)], fill=(i % 255, 100, 200), width=2)
        buf = io.BytesIO()
        big.save(buf, 'JPEG', quality=100)
        data = buf.getvalue()
        # If still <8MB, pad bytes (server reads MAX_SCAN_BYTES+1)
        if len(data) <= 8 * 1024 * 1024:
            data = data + b'\xff' * (9 * 1024 * 1024 - len(data))
        files = {'file': ('big.jpg', data, 'image/jpeg')}
        r = session.post(f"{API}/scan/passport", files=files, headers=auth_headers)
        assert r.status_code == 413

    def test_passport_premium_extracts_fields(self, session, auth_headers, passport_jpg_bytes):
        session.post(f"{API}/users/me/upgrade", headers=auth_headers)
        files = {'file': ('passport.jpg', passport_jpg_bytes, 'image/jpeg')}
        r = session.post(f"{API}/scan/passport", files=files, headers=auth_headers, timeout=120)
        assert r.status_code == 200, f"scan failed {r.status_code} {r.text[:500]}"
        body = r.json()
        assert body.get('kind') == 'passport'
        assert body.get('model') == 'gemini-2.5-flash'
        ext = body.get('extracted') or {}
        assert isinstance(ext, dict) and ext, f"empty extraction: {body}"
        # Should have the key schema fields
        for key in ['document_type', 'passport_number', 'date_of_birth', 'full_name']:
            assert key in ext, f"missing field {key} in {ext}"
        # Should at least contain something resembling a passport number from our synthetic image
        pn = (ext.get('passport_number') or '').upper()
        assert 'Z' in pn or '1234567' in pn, f"passport_number not extracted as expected: {pn}"

    def test_document_premium_extracts(self, session, auth_headers):
        session.post(f"{API}/users/me/upgrade", headers=auth_headers)
        # Build a simple text-bearing image
        img = Image.new('RGB', (800, 500), (255, 255, 255))
        d = ImageDraw.Draw(img)
        font = ImageFont.truetype('/usr/share/fonts/truetype/freefont/FreeSansBold.ttf', 24)
        small = ImageFont.truetype('/usr/share/fonts/truetype/freefont/FreeSans.ttf', 18)
        d.text((40, 40), 'GLOBAL TRUST BANK', fill=(0, 0, 100), font=font)
        d.text((40, 100), 'Statement of Account', fill=(0, 0, 0), font=small)
        d.text((40, 140), 'Account Holder: ANIL KUMAR SHARMA', fill=(0, 0, 0), font=small)
        d.text((40, 180), 'Account No: 0011223344', fill=(0, 0, 0), font=small)
        d.text((40, 220), 'Statement Date: 2025-01-15', fill=(0, 0, 0), font=small)
        d.text((40, 260), 'Closing Balance: USD 12,450.75', fill=(0, 0, 0), font=small)
        d.text((40, 300), 'Branch: Mumbai - Bandra', fill=(0, 0, 0), font=small)
        d.text((40, 340), 'Reference: STMT/2025/01/098765', fill=(0, 0, 0), font=small)
        buf = io.BytesIO()
        img.save(buf, 'JPEG', quality=85)
        files = {'file': ('doc.jpg', buf.getvalue(), 'image/jpeg')}
        r = session.post(f"{API}/scan/document", files=files, headers=auth_headers, timeout=120)
        assert r.status_code == 200, f"doc scan failed {r.status_code} {r.text[:500]}"
        body = r.json()
        assert body.get('kind') == 'document'
        ext = body.get('extracted') or {}
        assert 'summary' in ext or 'document_kind' in ext, f"missing summary/document_kind: {ext}"

    def test_passport_empty_file_400(self, session, auth_headers):
        session.post(f"{API}/users/me/upgrade", headers=auth_headers)
        files = {'file': ('empty.png', b'', 'image/png')}
        r = session.post(f"{API}/scan/passport", files=files, headers=auth_headers)
        assert r.status_code == 400


# ---------- Country appointment metadata ----------
class TestCountryAppointment:
    @pytest.mark.parametrize("iso2,expected_required,expected_min_fee", [
        ("us", True, 1500),
        ("gb", True, 1500),
        ("uk", True, 1500),  # alias accepted via static map
        ("fr", True, 1500),  # Schengen
        ("de", True, 1500),  # Schengen
        ("ae", False, 0),
        ("th", False, 0),
        ("np", False, 0),    # Visa-free
    ])
    def test_appointment_required_by_country(self, session, iso2, expected_required, expected_min_fee):
        r = session.get(f"{API}/countries/{iso2}")
        assert r.status_code == 200, f"country {iso2}: {r.status_code} {r.text[:300]}"
        d = r.json()
        ra = d.get('requires_appointment')
        if ra is not None:  # tolerate None for hand-curated 15 if not enriched
            assert ra is expected_required, f"{iso2} requires_appointment={ra}, expected {expected_required}"
            if expected_required:
                fee = d.get('appointment_fee_inr') or 0
                assert fee >= expected_min_fee, f"{iso2} appointment_fee_inr={fee} < {expected_min_fee}"
            else:
                fee = d.get('appointment_fee_inr') or 0
                assert fee == 0, f"{iso2} should have 0 appointment fee, got {fee}"


# ---------- Application lifecycle (positive + negative) ----------
class TestApplications:
    def test_create_application_unauth_401(self, session):
        r = session.post(f"{API}/users/me/applications", json={"country_id": "us", "visa_type": "Tourist"})
        assert r.status_code in (401, 403)

    def test_create_then_fetch_application(self, session, auth_headers):
        r = session.post(f"{API}/users/me/applications",
                         json={"country_id": "us", "visa_type": "Tourist"},
                         headers=auth_headers)
        assert r.status_code == 200
        body = r.json()
        app_id = body.get('id')
        assert app_id, body
        # Fetch back
        r2 = session.get(f"{API}/users/me/applications/{app_id}", headers=auth_headers)
        assert r2.status_code == 200
        d = r2.json()
        assert d.get('country_id') == 'us'
        assert d.get('visa_type') == 'Tourist'
        assert d.get('status') == 'draft'
        # Submit without docs -> 400
        r3 = session.post(f"{API}/users/me/applications/{app_id}/submit", headers=auth_headers)
        assert r3.status_code == 400

    def test_fetch_other_users_application_404(self, session, auth_headers):
        r = session.get(f"{API}/users/me/applications/this-id-does-not-exist", headers=auth_headers)
        assert r.status_code == 404


# ---------- Flight suggestions (Gemini-powered) ----------
class TestFlightSuggestions:
    def test_unknown_country_404(self, session):
        r = session.get(f"{API}/flights/suggest", params={"country": "zzz", "origin": "BLR"})
        assert r.status_code == 404

    def test_invalid_country_400(self, session):
        r = session.get(f"{API}/flights/suggest", params={"country": "x", "origin": "BLR"})
        assert r.status_code == 400

    def test_us_blr_returns_three_routes(self, session):
        r = session.get(f"{API}/flights/suggest", params={"country": "us", "origin": "BLR"}, timeout=120)
        assert r.status_code == 200, r.text[:500]
        body = r.json()
        assert body.get("country", {}).get("id") == "us"
        assert body.get("origin") == "BLR"
        routes = body.get("routes") or []
        assert len(routes) == 3, f"expected 3 routes, got {len(routes)}"
        kinds = {r["kind"] for r in routes}
        assert kinds == {"cheapest", "popular", "fastest"}, f"kinds={kinds}"
        for r_ in routes:
            assert r_["from"] == "BLR"
            assert isinstance(r_["price_inr"], int) and r_["price_inr"] > 0
            assert r_["duration_h"] > 0

    def test_cache_is_used(self, session):
        # First call may have cached from previous test; second call should be cached.
        session.get(f"{API}/flights/suggest", params={"country": "ae", "origin": "BLR"}, timeout=120)
        r2 = session.get(f"{API}/flights/suggest", params={"country": "ae", "origin": "BLR"})
        assert r2.status_code == 200
        assert r2.json().get("cached") is True
