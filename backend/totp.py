"""TOTP (RFC 6238, the Google Authenticator / Authy / 1Password codes) and recovery codes.

Secrets are stored encrypted with the BYOK vault key; recovery codes are stored as SHA-256 hashes
and are single-use. `verify` returns the matched time step so callers can refuse a replay of the
same code (store it as `totp_last_step`).
"""
import base64
import hashlib
import hmac
import secrets
import struct
import time
from typing import Optional
from urllib.parse import quote

STEP = 30
DIGITS = 6
ISSUER = 'We Hive Admin'


def generate_secret() -> str:
    return base64.b32encode(secrets.token_bytes(20)).decode().rstrip('=')


def _key(secret: str) -> bytes:
    s = secret.upper().replace(' ', '')
    return base64.b32decode(s + '=' * (-len(s) % 8))


def code_at(secret: str, step: int) -> str:
    digest = hmac.new(_key(secret), struct.pack('>Q', step), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    value = struct.unpack('>I', digest[offset:offset + 4])[0] & 0x7FFFFFFF
    return str(value % 10 ** DIGITS).zfill(DIGITS)


def verify(secret: str, code: str, *, last_step: int = -1, window: int = 1, now: Optional[float] = None) -> Optional[int]:
    """Matched step, or None. Accepts ±`window` steps of clock drift; never a step <= last_step."""
    code = (code or '').replace(' ', '')
    if len(code) != DIGITS or not code.isdigit():
        return None
    current = int((time.time() if now is None else now) // STEP)
    for step in range(current - window, current + window + 1):
        if step > last_step and hmac.compare_digest(code_at(secret, step), code):
            return step
    return None


def otpauth_uri(secret: str, account: str) -> str:
    return (f'otpauth://totp/{quote(ISSUER)}:{quote(account)}'
            f'?secret={secret}&issuer={quote(ISSUER)}&algorithm=SHA1&digits={DIGITS}&period={STEP}')


# ---------- recovery codes ----------
def _norm(code: str) -> str:
    return (code or '').replace('-', '').replace(' ', '').lower()


def hash_recovery(code: str) -> str:
    return hashlib.sha256(_norm(code).encode()).hexdigest()


def new_recovery_codes(n: int = 10) -> tuple[list[str], list[str]]:
    """(codes to show once, hashes to store)."""
    codes = []
    for _ in range(n):
        raw = secrets.token_hex(5)  # 10 hex chars
        codes.append(f'{raw[:5]}-{raw[5:]}')
    return codes, [hash_recovery(c) for c in codes]


def looks_like_recovery(code: str) -> bool:
    c = _norm(code)
    return len(c) == 10 and all(ch in '0123456789abcdef' for ch in c)
