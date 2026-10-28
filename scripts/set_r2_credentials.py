#!/usr/bin/env python3
"""
One-shot script: saves R2 credentials into WeHive's settings store via the admin API.
Run once after deploy — the backend reads these from MongoDB on every R2 operation.

Usage:
    # Set env vars (never hardcode — use a local .env or pass on the command line)
    export WEHIVE_ADMIN_EMAIL=admin@wehive.co.in
    export WEHIVE_ADMIN_PASSWORD=yourpassword
    export R2_ACCOUNT_ID=your_account_id
    export R2_ACCESS_KEY_ID=your_access_key_id
    export R2_SECRET_ACCESS_KEY=your_secret_access_key
    export R2_BUCKET=wehive
    export R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
    export R2_PUBLIC_URL=https://<account_id>.r2.cloudflarestorage.com/wehive

    python scripts/set_r2_credentials.py [--base-url https://wehive.co.in/api]

    # Or load from a .env file first:
    set -o allexport; source .env; set +o allexport
    python scripts/set_r2_credentials.py
"""
import argparse
import os
import sys
import json
try:
    import requests
except ImportError:
    sys.exit("pip install requests")

DEFAULT_BASE_URL = os.environ.get("WEHIVE_API_URL", "https://wehive.co.in/api")


def _require_env(key: str) -> str:
    val = os.environ.get(key, "").strip()
    if not val:
        sys.exit(f"Missing required environment variable: {key}")
    return val


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-url", default=DEFAULT_BASE_URL)
    args = ap.parse_args()
    base = args.base_url.rstrip("/")

    admin_email    = _require_env("WEHIVE_ADMIN_EMAIL")
    admin_password = _require_env("WEHIVE_ADMIN_PASSWORD")

    account_id        = _require_env("R2_ACCOUNT_ID")
    access_key_id     = _require_env("R2_ACCESS_KEY_ID")
    secret_access_key = _require_env("R2_SECRET_ACCESS_KEY")
    bucket            = os.environ.get("R2_BUCKET", "wehive")
    endpoint          = os.environ.get("R2_ENDPOINT", f"https://{account_id}.r2.cloudflarestorage.com")
    public_url        = os.environ.get("R2_PUBLIC_URL", f"{endpoint}/{bucket}")

    r2_settings = {
        "account_id":        account_id,
        "access_key_id":     access_key_id,
        "secret_access_key": secret_access_key,
        "bucket":            bucket,
        "endpoint":          endpoint,
        "public_url":        public_url,
    }

    # 1. Log in as admin
    print(f"Logging in to {base} …")
    r = requests.post(f"{base}/admin-auth/login",
                      json={"email": admin_email, "password": admin_password},
                      timeout=15)
    r.raise_for_status()
    token = r.json().get("token") or r.json().get("access_token")
    if not token:
        sys.exit(f"Login OK but no token in response: {r.text[:200]}")
    print("  ✓ Logged in")

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # 2. Save R2 namespace
    print("Saving R2 settings …")
    r = requests.put(f"{base}/admin/settings/r2",
                     json={"data": r2_settings},
                     headers=headers,
                     timeout=15)
    if r.status_code == 200:
        print("  ✓ R2 settings saved")
    else:
        print(f"  ✗ {r.status_code}: {r.text[:300]}")
        sys.exit(1)

    # 3. Verify by reading back
    r = requests.get(f"{base}/admin/settings/r2", headers=headers, timeout=15)
    if r.ok:
        saved = r.json()
        display = {**saved}
        if "secret_access_key" in display:
            display["secret_access_key"] = display["secret_access_key"][:6] + "…"
        print("  Saved values:", json.dumps(display, indent=2))
    else:
        print(f"  Could not read back: {r.status_code}")

    print("\nDone. R2 images should now load in the admin destinations panel.")


if __name__ == "__main__":
    main()
