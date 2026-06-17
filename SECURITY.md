# Wehive Security Hardening Guide

## CRITICAL: Rotate These Credentials Immediately

The following credentials are present in `backend/.env` and must be rotated NOW if this repo was ever pushed to GitHub or shared externally.

---

### 1. Firebase Service Account Key — ROTATE IMMEDIATELY

**Risk:** Full admin access to the Firebase project (Firestore, Auth, Storage).

Steps:
1. Go to [Firebase Console](https://console.firebase.google.com) → Project `wehive-28c95`
2. Settings → Service accounts → Generate new private key
3. Download the new JSON, delete the old one from the Firebase console
4. Update `FIREBASE_CREDENTIALS` in your deployment environment
5. Never commit the new key to git

---

### 2. JWT Secret — REPLACE NOW

**Risk:** Anyone with the current secret can forge authentication tokens for any user or admin.

Generate a new secret:
```bash
python -c "import secrets; print(secrets.token_hex(64))"
```
Set `JWT_SECRET=<output>` in your deployment environment variables.
Remove it from `backend/.env` in production — use the deployment dashboard only.

---

### 3. Admin Passwords — CHANGE NOW

Passwords currently seeded from `.env` (`ADMIN_SEED_PASSWORD`, `ADMIN_SEEDS_JSON`):
- `admin@wehive.co.in`
- `info@wehive.co.in`
- `krishnakranthiteja@gmail.com`

Log in to the admin panel and change all three passwords immediately.
Then remove the plain-text password values from `.env` and use random values going forward.

---

### 4. Telegram Bot Token — REVOKE AND REGENERATE

1. Open `@BotFather` on Telegram → `/revoke` the token for `wehive_global_bot`
2. Generate a new token with `/token`
3. Update `TELEGRAM_BOT_TOKEN` in deployment env

---

### 5. Discord Webhook URL — DELETE AND RECREATE

1. Open the Discord channel → Edit → Integrations → Webhooks
2. Delete the existing webhook
3. Create a new one and update `DISCORD_WEBHOOK_URL` in deployment env

---

## Environment Variable Best Practices

| Variable | Must be set in | Must NOT be in |
|---|---|---|
| `JWT_SECRET` | Deployment dashboard | `.env`, git |
| `FIREBASE_CREDENTIALS` | Deployment dashboard | `.env`, git |
| `ADMIN_SEED_PASSWORD` | Deployment dashboard | `.env`, git |
| `TELEGRAM_BOT_TOKEN` | Deployment dashboard | `.env`, git |
| `DISCORD_WEBHOOK_URL` | Deployment dashboard | `.env`, git |
| `MONGO_URL` | Deployment dashboard | `.env`, git |

The `backend/.env` file is in `.gitignore`. Keep it that way.
For local dev, use placeholder/mock values only — never production credentials.

---

## Production Config Checklist

- [ ] `JWT_SECRET` is a 64-byte random hex string (not `change_me`)
- [ ] `APP_ENV=production` is set in the deployment environment
- [ ] `OTP_CHANNEL=email` or `OTP_CHANNEL=sms` (not `mock`)
- [ ] `JWT_EXPIRES_HOURS=24` (default is now 24h)
- [ ] Firebase Security Rules restrict read/write to authenticated users only
- [ ] Cloudflare R2 bucket is private (no public access)
- [ ] `ALLOWED_ORIGINS` is set to `https://wehive.co.in,https://www.wehive.co.in`
- [ ] HTTPS enforced everywhere (no HTTP fallback)
- [ ] MongoDB user has minimal permissions (no `admin` role)

---

## What Was Fixed in Code

| Issue | Fix | File |
|---|---|---|
| Weak JWT secret allowed in prod | Server refuses to start if secret is default | `auth_utils.py` |
| JWT TTL was 30 days | Reduced to 24 hours | `auth_utils.py` |
| OTP channel mode leaked publicly | Removed from `/api/` response | `server.py` |
| File type validated by client header only | Magic-byte detection added | `routes_apps.py`, `routes_scan.py` |
| Path traversal via filename | `os.path.basename` + regex sanitizer + resolve() guard | `routes_apps.py` |
| Prompt injection via `hint` | Sanitized and labelled as data, not instructions | `routes_scan.py` |
| No rate limiting on OTP/login/upload | Sliding-window limiter (5 OTP/10min, 10 login/min, 20 upload/min) | `rate_limit.py`, `routes_auth.py`, `routes_apps.py` |
