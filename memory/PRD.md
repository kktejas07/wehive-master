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
### Round 1 — AI scanning + 250-country DB
- Added `is_premium` + `premium_since` fields to users.
- New FastAPI router `routes_scan.py` (`/scan/passport`, `/scan/document`).
  Premium-gated. Uses Gemini 2.5 Flash via `emergentintegrations`.
- `seed_countries.py` — ingests 250 countries from restcountries.com into
  `countries_v2`. Manual entries for 15 priority countries preserved.
- `routes_countries.py` now DB-backed with static fallback.
- React `AIScanModal` — premium gate → file picker → extraction view →
  "Use these values" autofill on `ApplicationDetail`.
- `AuthContext.refreshUser()` + Account page shows **Plan** (Free/Premium).
- Robust error handling for budget exhaustion, invalid images, empty uploads.

### Round 2 — Hero search + initial fee breakdown
- `HeroSearchLive.jsx` — backend-powered live autocomplete across all 250
  countries with debounce + keyboard nav.
- Country card image fallback uses `flag_url` when no curated landmark.

### Round 3 — Final fee structure + flights + animations (this round)
- **New fee structure** (`FeeBreakdown.jsx`):
  - **Base service fee ₹3,500** (no longer tier-based; "Hive fee" line removed)
  - **₹350 surcharge per additional applicant** (only shown when >1)
  - **Country-specific appointment / VFS fee** — only displayed when the
    country requires biometrics (US, UK, Schengen 26, AU, NZ, CA, JP, CN, KR, CH)
  - GST 18 % on (service + surcharge + appointment) · HSN 998599
  - Govt fee passes through with no markup
  - Visa-free destinations show "No fees apply" emerald card
  - Applicants stepper (1-20) with +/- buttons
- **Country appointment metadata** (`seed_countries.py`):
  - `requires_appointment: bool`
  - `appointment_fee_inr: int` (US ₹1,750, GB ₹2,400, CA ₹1,900,
    AU/NZ ₹1,700, Schengen ₹1,900, JP ₹1,200, CN ₹1,500, KR ₹1,200)
- **Curated landmark images** (`/app/frontend/src/lib/landmarks.js`) for ~50
  popular countries (US: Statue of Liberty, UK: Big Ben, JP: Tokyo Tower,
  FR: Eiffel Tower, IN: Taj Mahal, …) used by `CountryGrid` cards.
- **AI Flight Suggestions** module (`FlightSuggestions.jsx`) — Cheapest /
  Most popular / Fastest cards per country. Stubbed dataset, structured for
  future `/api/flights/suggest` + LLM rerank.
- **Framer Motion animations**:
  - `AnimatePresence` page transitions via `PageTransition.jsx` wrapper
    around all routes in `App.js`
  - Country cards: scroll-reveal (`initial → whileInView`) + hover lift
  - Flight cards: staggered entrance + hover lift
- **Comprehensive backend tests** (`/app/backend/tests/test_wehive_backend.py`):
  **28/28 passing** — countries (8), premium toggle (2), AI scan
  positive+negative (7), country appointment metadata (8 parametrised),
  application lifecycle (3).
- Fixed pre-existing nested `<a>` warning in country grid (Plan button is
  now a span button, not a Link inside a Link).

### Round 4 — Translation polish + visa-free pricing fix (this round)
- **i18n coverage extended** — added new keys (`hero.suggestions`, `hero.matching`,
  `hero.searchKeys`, `hero.searchSource`, `hero.noMatch`, `cta.signIn`,
  `cta.signUp`, `cta.callUs`, `fee.visaFreeNote`) to all 6 languages
  (en / hi / te / ta / kn / bn).
- Wired `useI18n()` into:
  - `Hero.jsx` — headline / sub / suggestion-strip label
  - `HeroSearchLive.jsx` — placeholder, button, no-match copy, popover footer
  - `Navbar.jsx` (`PhoneBlock`, `MobileMenu`) — "Call us", Sign in, Sign up
  - `UserMenu.jsx` — desktop Sign in / Sign up
  - `FeeBreakdown.jsx` — visa-free banner now localised (`fee.visaFreeNote`)
- `LanguageSwitcher` got `data-testid="language-switcher-button"` +
  `data-testid="language-option-{code}"` on each option.
- **Pricing rule update — visa-free destinations now charge our service fees**:
  - Removed the old "fee-breakdown-free" early return that returned ₹0.
  - Total = Base ₹3,500 + ₹350 × extra applicants + 18 % GST → ₹4,130 for
    1 applicant on Nepal / Bhutan / Indonesia etc.
  - A green `data-testid="visa-free-note"` banner inside the fee-breakdown
    card explains "no government fee — you pay only for our concierge service".
  - GST is still applied **only** to the Wehive portion (base + surcharge +
    appointment), never to the government fee.
- Apply CTA / Total meta-card always show the rupee amount (no "Free" label).

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
