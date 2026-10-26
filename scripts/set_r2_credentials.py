#!/usr/bin/env python3
"""
One-shot script: saves R2 credentials into WeHive's settings store via the admin API.
Run once after deploy — the backend reads these from MongoDB on every R2 operation.

Usage:
    python scripts/set_r2_credentials.py [--base-url https://wehive.co.in/api]
"""
import argparse
import sys
import json
try:
    import requests
except ImportError:
    sys.exit("pip install requests")

BASE_URL = "https://wehive.co.in/api"
ADMIN_EMAIL = "admin@wehive.co.in"
ADMIN_PASSWORD = "Omsairam@0504"

R2_SETTINGS = {
    "account_id":        "23d84483143fd42340ed364e4bcfd75b",
    "access_key_id":     "28d1ec84c75b7e1790c723fe69683671",
    "secret_access_key": "464b106831f4fd9c25f441f6617d95027acdec0248af06325ddb5c84050c03ec",
    "bucket":            "wehive",
    "endpoint":          "https://23d84483143fd42340ed364e4bcfd75b.r2.cloudflarestorage.com",
    "public_url":        "https://23d84483143fd42340ed364e4bcfd75b.r2.cloudflarestorage.com/wehive",
}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-url", default=BASE_URL)
    args = ap.parse_args()
    base = args.base_url.rstrip("/")

    # 1. Log in as admin
    print(f"Logging in to {base} …")
    r = requests.post(f"{base}/admin-auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
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
                     json={"data": R2_SETTINGS},
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
        # mask secret in output
        display = {**saved}
        if "secret_access_key" in display:
            display["secret_access_key"] = display["secret_access_key"][:6] + "…"
        print("  Saved values:", json.dumps(display, indent=2))
    else:
        print(f"  Could not read back: {r.status_code}")

    print("\nDone. R2 images should now load in the admin destinations panel.")

if __name__ == "__main__":
    main()
