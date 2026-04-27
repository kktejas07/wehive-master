# Wehive — Product Requirements Document

_Last updated: 27 Feb 2026_

## Original problem statement
Clone the "Atlys" website for a brand called **Wehive** with elite minimalist
designs. The application evolved into a full-stack platform (React + FastAPI +
MongoDB) that handles real WhatsApp/Email OTP authentication, rich visa
categorisations, application timelines, document uploads, AI Chatbot integration,
multi-language support (i18n), superhero avatars, and **AI-powered document
scanning** for visa form auto-fill.

## Target users
- Indian passport holders applying for Tourist / Business / Student / Work visas.
- Travellers researching visa requirements, fees, processing times, and
  holiday plans for 250 countries.

## Core requirements
1. Atlys-style country catalogue with filter bar (visa type, delivery, docs).
2. Hybrid OTP auth — WhatsApp (Twilio sandbox) + Email (SMTP) + mock fallback.
3. Application lifecycle — draft → submitted → in_review → approved/rejected,
   with upload checklist and PDF receipt.
4. Multi-language UI (EN, HI, TE, TA, KN, AR) with a custom lightweight i18n.
5. Floating AI chatbot powered by Emergent LLM (Gemini 2.5 Flash).
6. **AI Scanning (Premium)** — Gemini 2.5 Flash vision extracts passport fields,
   MRZ, and supporting-document metadata.
7. **250-country DB** — REST Countries ingestion + handcrafted visa metadata
   for 15 priority destinations.

## Architecture
- **Frontend**: React + TailwindCSS + Framer Motion + shadcn/ui.
- **Backend**: FastAPI + Motor (async Mongo) + PyJWT + Bcrypt + ReportLab.
- **Data**: MongoDB (`countries_v2`, `users`, `applications`, `holiday_plans`,
  `chat_sessions`, `chat_messages`, `leads`, `otps`).
- **Integrations**: Twilio (WhatsApp OTP), SMTP (Email OTP), emergentintegrations
  (Gemini text + vision), REST Countries API (one-off seed).

## Key endpoints
- `POST /api/auth/send-otp`, `POST /api/auth/verify-otp`, `GET /api/auth/me`
- `GET /api/countries?q=&visa_type=&no_visa=`, `GET /api/countries/{id}`
- `POST /api/users/me/applications`, `GET /api/users/me/applications`
- `GET /api/users/me/applications/{id}` + `/documents`, `/submit`, `/receipt.pdf`
- `POST /api/users/me/upgrade` / `downgrade` — toggles `is_premium`
- `POST /api/scan/passport` / `POST /api/scan/document` — **Premium** (402 if not)
- `POST /api/chatbot/sessions`, `POST /api/chatbot/sessions/{id}/messages`

## Changelog — Feb 2026 session
- ✅ Added `is_premium` + `premium_since` fields to users.
- ✅ New FastAPI router `routes_scan.py` with `/scan/passport` and `/scan/document`
  endpoints. Premium-gated (402). Uses Gemini 2.5 Flash with structured JSON
  prompts. Robust error handling for budget, invalid-image, and network failures.
- ✅ `seed_countries.py` script — ingests 250 countries from restcountries.com
  into `countries_v2`. Preserves handcrafted metadata for 15 priority countries.
- ✅ `routes_countries.py` now DB-backed with static fallback.
- ✅ React `AIScanModal` component (premium gate → file picker → extraction
  preview → "Use these values" autofill). Integrated into `ApplicationDetail`.
- ✅ `AuthContext.refreshUser()` + Account page shows **Plan** (Free/Premium).
- ✅ Backend error handling for `ChatError`, empty uploads, budget exhaustion.

## Known limitations / Backlog
- **P1 (blocker for real emails)**: `SMTP_PASSWORD` is a placeholder. Requires
  Gmail App Password from user.
- **P1**: Twilio WhatsApp Sandbox opt-in pending user action (send "join …" to
  +14155238886 from their phone).
- **P1**: `POST /api/users/me/upgrade` is a demo toggle. Replace with Stripe /
  Razorpay webhook-driven entitlement before production.
- **P2**: Nested `<a>` hydration warning (pre-existing) needs cleanup.
- **P2**: `Link` inside `Link` cleanup somewhere in layout.
- **P2**: Frontend uses a static `COUNTRIES` mock for hero image lookup; should
  migrate to DB flag URLs.
- **P2**: `/api/scan/*` returns 403 on missing-auth (default HTTPBearer). Could
  be normalised to 401 for consistency.

## Integrations credentials
- `EMERGENT_LLM_KEY` — Emergent Universal key (Gemini + OpenAI + Claude).
- `TWILIO_*` — provided, sandbox mode.
- `SMTP_*` — provided; App Password pending.

## Test credentials
See `/app/memory/test_credentials.md`.
