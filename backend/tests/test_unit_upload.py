"""Unit tests for file-upload security helpers in routes_apps.py and routes_scan.py.

Covers:
- Magic-byte MIME detection (PDF, JPEG, PNG, WEBP, HEIC)
- Rejection of unknown / executable file signatures
- Safe-filename sanitization (path traversal prevention)
- Path-escape guard (resolve-based check)
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'wehive_test')
os.environ.setdefault('JWT_SECRET', 'test_secret_key_for_unit_tests_do_not_use_in_prod')
os.environ.setdefault('APP_ENV', 'test')


# ── import helpers directly from the modules ─────────────────────────────────
from routes_apps import _detect_mime, _safe_filename, UPLOAD_ROOT, ALLOWED_MIME
from routes_scan import _detect_scan_mime, ALLOWED_MIME as SCAN_ALLOWED_MIME


# ─────────────────────────────────────────────────────────────────────────────
# Helpers to build minimal valid file headers
# ─────────────────────────────────────────────────────────────────────────────
def _pdf_bytes():
    return b'%PDF-1.4 fake content'

def _jpeg_bytes():
    return b'\xff\xd8\xff\xe0' + b'\x00' * 50

def _png_bytes():
    return b'\x89PNG\r\n\x1a\n' + b'\x00' * 50

def _webp_bytes():
    return b'RIFF' + b'\x00' * 4 + b'WEBP' + b'\x00' * 20

def _heic_bytes():
    # Minimal HEIC: 4-byte size + 'ftyp' + 'heic'
    return b'\x00\x00\x00\x18' + b'ftyp' + b'heic' + b'\x00' * 20

def _exe_bytes():
    return b'MZ' + b'\x00' * 50   # Windows PE

def _html_bytes():
    return b'<html><body>xss</body></html>'

def _zip_bytes():
    return b'PK\x03\x04' + b'\x00' * 50

def _php_bytes():
    return b'<?php system($_GET["cmd"]); ?>'


# ─────────────────────────────────────────────────────────────────────────────
# routes_apps: _detect_mime
# ─────────────────────────────────────────────────────────────────────────────
class TestDetectMime:
    def test_pdf_detected(self):
        assert _detect_mime(_pdf_bytes()) == 'application/pdf'

    def test_jpeg_detected(self):
        assert _detect_mime(_jpeg_bytes()) == 'image/jpeg'

    def test_png_detected(self):
        assert _detect_mime(_png_bytes()) == 'image/png'

    def test_webp_detected(self):
        assert _detect_mime(_webp_bytes()) == 'image/webp'

    def test_heic_detected(self):
        result = _detect_mime(_heic_bytes())
        assert result == 'image/heic'

    def test_exe_returns_none(self):
        assert _detect_mime(_exe_bytes()) is None

    def test_html_returns_none(self):
        assert _detect_mime(_html_bytes()) is None

    def test_zip_returns_none(self):
        assert _detect_mime(_zip_bytes()) is None

    def test_php_returns_none(self):
        assert _detect_mime(_php_bytes()) is None

    def test_empty_bytes_returns_none(self):
        assert _detect_mime(b'') is None

    def test_random_bytes_returns_none(self):
        assert _detect_mime(b'\x00\x01\x02\x03\x04\x05') is None

    def test_detected_mime_in_allowed_set(self):
        for data in [_pdf_bytes(), _jpeg_bytes(), _png_bytes(), _webp_bytes()]:
            detected = _detect_mime(data)
            assert detected in ALLOWED_MIME, f'{detected} not in ALLOWED_MIME'

    def test_riff_without_webp_marker_returns_none(self):
        # RIFF....MPEG is not WEBP
        data = b'RIFF' + b'\x00' * 4 + b'MPEG' + b'\x00' * 20
        assert _detect_mime(data) is None


# ─────────────────────────────────────────────────────────────────────────────
# routes_scan: _detect_scan_mime  (images only)
# ─────────────────────────────────────────────────────────────────────────────
class TestDetectScanMime:
    def test_jpeg_detected(self):
        assert _detect_scan_mime(_jpeg_bytes()) == 'image/jpeg'

    def test_png_detected(self):
        assert _detect_scan_mime(_png_bytes()) == 'image/png'

    def test_webp_detected(self):
        assert _detect_scan_mime(_webp_bytes()) == 'image/webp'

    def test_pdf_not_accepted_by_scan(self):
        # PDF is allowed for documents but NOT for passport/document image scan
        result = _detect_scan_mime(_pdf_bytes())
        if result is not None:
            assert result not in SCAN_ALLOWED_MIME

    def test_exe_returns_none(self):
        assert _detect_scan_mime(_exe_bytes()) is None

    def test_empty_returns_none(self):
        assert _detect_scan_mime(b'') is None


# ─────────────────────────────────────────────────────────────────────────────
# _safe_filename: path-traversal and character sanitization
# ─────────────────────────────────────────────────────────────────────────────
class TestSafeFilename:
    def test_normal_name_unchanged(self):
        assert _safe_filename('passport.pdf') == 'passport.pdf'

    def test_strips_directory_components(self):
        result = _safe_filename('../../etc/passwd')
        assert '/' not in result
        assert '..' not in result
        assert result  # not empty

    def test_strips_windows_path(self):
        result = _safe_filename('C:\\Windows\\system32\\evil.exe')
        assert '\\' not in result
        assert ':' not in result

    def test_replaces_spaces(self):
        result = _safe_filename('my document.pdf')
        assert ' ' not in result

    def test_max_length_120(self):
        long_name = 'a' * 200 + '.pdf'
        assert len(_safe_filename(long_name)) <= 120

    def test_empty_string_returns_document(self):
        assert _safe_filename('') == 'document'

    def test_only_slashes_returns_document(self):
        assert _safe_filename('///') == 'document'

    def test_preserves_extension(self):
        result = _safe_filename('scan.png')
        assert result.endswith('.png')

    def test_unicode_stripped_to_safe(self):
        result = _safe_filename('паспорт.pdf')
        # Should not crash and should produce a safe string
        assert isinstance(result, str)
        assert len(result) > 0

    def test_null_byte_removed(self):
        result = _safe_filename('file\x00name.pdf')
        assert '\x00' not in result

    def test_semicolons_and_pipes_removed(self):
        result = _safe_filename('file;rm -rf|.pdf')
        assert ';' not in result
        assert '|' not in result


# ─────────────────────────────────────────────────────────────────────────────
# Path escape guard  (resolve-based check in upload_document)
# The guard is: not str(saved_path).startswith(str(UPLOAD_ROOT.resolve()))
# We test the logic directly with pathlib.
# ─────────────────────────────────────────────────────────────────────────────
class TestPathEscapeGuard:
    def test_normal_path_passes(self, tmp_path):
        """A path inside the upload root should pass the guard."""
        root = tmp_path / 'uploads'
        root.mkdir()
        candidate = (root / 'user1' / 'app1' / 'file.pdf').resolve()
        assert str(candidate).startswith(str(root.resolve()))

    def test_traversal_path_blocked(self, tmp_path):
        """A path that escapes the upload root should be blocked."""
        root = tmp_path / 'uploads'
        root.mkdir()
        # Even though _safe_filename strips .., confirm the guard catches it
        candidate = (root / '..' / '..' / 'etc' / 'passwd').resolve()
        assert not str(candidate).startswith(str(root.resolve()))
