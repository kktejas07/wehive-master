# Wehive — Product Requirements Document

_Last updated: 30 Apr 2026 (Round 12)_

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

### Round 5 — Final fee math: tier-based base + per-applicant scaling (this round)
- **Visible rows simplified to 3 max**: Application fee · Appointment / VFS fee
  (when required) · GST (18 %).
- **"Base service fee" row hidden** — folded into a single **Application fee**
  row that combines `(Govt fee + Base service fee) × applicants`.
- **"Additional applicants" surcharge row hidden** — the ₹350 × (N − 1)
  surcharge is silently folded into the GST line for display.
- **Per-applicant scaling**: Application AND Appointment scale linearly with
  the number of applicants (so total roughly doubles at N = 2).
- **Tier-based base service fees** (`BASE_FEE_BY_TYPE` in FeeBreakdown.jsx):
  Tourist ₹3,500 · Business ₹4,500 · Student / F-1 ₹5,500 · Work ₹7,500 ·
  Transit ₹2,500 · Medical ₹4,000.
- Internal formula (unchanged from round 4 in spirit, just regrouped on screen):
  `Total = (Govt + Base) × N + Appointment × N + 350 × (N−1) + 18% × (Base × N + Appointment × N)`
- Verified to the rupee on US Tourist 1/2/3, US Student 1, US Work 1, US
  Business 1, UAE 1/2, Nepal 1/2.

### Round 6 — Animations, responsive polish, Eva rename, bigger logo (this round)
- **AI assistant renamed `Hive → Eva`** in the chatbot widget header, loading
  indicator, and the backend LLM system prompt. All 6 language translations
  of `chatbot.title` updated + new `chatbot.thinking` key localised too.
  Brand name "We Hive" intact. Verified via live LLM call: "Hi there, what
  is your name?" → "Hello! I'm Eva, your friendly visa and travel assistant
  from We Hive Immigration Services."
- **Navbar logo enlarged** from `h-14 sm:h-16` to `h-20 sm:h-24 lg:h-28`
  (desktop 112 px). Nav row height bumped to `h-[96px] sm:h-[108px]`.
  Hero `pt-36 sm:pt-44` to avoid content hiding under the taller nav.
- **New `Reveal.jsx`** wrapper (framer-motion `whileInView` with
  index-based stagger) applied across the landing page:
  - Hero: trust-pill, H1, sub-copy, FilterBar, HeroSearch stagger in on mount.
  - HowItWorks: StepCards, ServiceCards, FeatureCards, StatCards stagger.
  - Testimonials / PressStrip / Faq / CtaBanner / CountryGrid: section
    headings reveal; CTA banner reveals from left+right; PressStrip logos
    stagger with hover lift; FAQ items slide in from the left.
- **Mobile responsiveness polish**: typography scaled down on `< sm`
  (text-[28px] sm:text-[40px] lg:text-[48px] for section headers), padding
  gated `py-16 sm:py-24 lg:py-28`. CountryGrid moves to 2-col on mobile,
  3-col on tablet, 4-col on desktop.

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

### Round 8 — Apply flow: review modal + redirect to draft page (this round)
**Bug fix**: Clicking the "Apply" button on a country page used to silently
create a draft via `POST /users/me/applications` and only show a toast — the
user was never taken anywhere, so the draft sat hidden in the dashboard.

**Fix**:
- New `ApplicationReviewModal.jsx` opens as **Step 1 of 2 — Review** before
  any draft is created.
- Modal collects: travel date (default = today + 21 days), primary applicant
  name (prefilled from logged-in user), email & mobile (prefilled), and shows
  a live fee estimate matching the FeeBreakdown card.
- "Continue to documents" → `POST /users/me/applications` with the new fields
  (`applicants`, `travel_date`, `primary_applicant`) → on success **redirects
  to `/account/applications/{id}`** so the user immediately lands on the
  document-checklist + timeline + AI-scan view.
- Cancel keeps the user on `/visa/{id}` with no DB write.
- Backend `ApplicationCreate` model now accepts `applicants: int = 1` and
  `primary_applicant: PrimaryApplicant | None`. Documents stored in MongoDB.
- All 28 pytest tests still pass.

### Round 9 — Review breadcrumb + real /api/flights/suggest (this round)
- **`ApplicationReviewModal`** now shows a 3-step **breadcrumb trail**
  (1. Review · 2. Documents · 3. Submit & Pay) so the user can clearly see
  they're at the review stage and not paying. Plus a green
  "You're reviewing — not paying. No card needed." banner inside the modal.
  data-testids: `apply-review-trail`, `apply-review-step-{n}`,
  `apply-no-payment-banner`.
- **New backend endpoint `GET /api/flights/suggest`** in `routes_flights.py`:
  - Calls Gemini 2.5 Flash via emergentintegrations to generate three
    realistic routes (cheapest, most popular, fastest) for `BLR → {country}`
    with airline, code, IATA, stops, duration_h and price_inr.
  - Cached in `flights_cache` collection per `(country, origin)` for 6 h.
  - 404 on unknown country, 400 on invalid id, 502 on LLM/parse failure.
  - Honors `?origin=BLR|DEL|BOM|MAA|HYD|CCU` and `?refresh=true`.
- **Frontend `FlightSuggestions`** now consumes the live endpoint:
  origin selector, "Refresh" button (regenerates), "cached" badge.
  Falls back to a tiny local stub for UAE if the API is down.
- **4 new pytest cases** for the flights endpoint — all passing
  (`32/32` total).

### Round 12 — My scans history + PropTypes (this round)

**1. "My scans" history tab on /account**

Backend:
- New dedicated `scans` MongoDB collection (index on `user_id, created_at`).
- `POST /api/scan/passport` and `/document` now **always** persist to
  `scans` (in addition to the optional embedded `applications.scans[]` push
  when `application_id` is provided).
- `GET /api/scan/history` — paginated `{total, items, limit, skip}` with
  `raw` field stripped.
- `DELETE /api/scan/{scan_id}` — deletes from `scans` AND pulls the entry
  from `applications.scans[]` when the scan was linked to an app.
  Enforces owner check via `user_id`.

Frontend:
- New `ScansTab` under `/components/account/ScansTab.jsx` — cards per
  scan (passport vs document UI), confidence badge, warnings block,
  linked-application deep link, delete with confirm, raw-JSON modal,
  all-vs-passport-vs-document filter, premium-aware empty state.
- `Account.jsx` adds `'scans'` to the tab list between Applications and
  Saved plans.
- `UserMenu` gets a new "My AI scans" quick link.

**2. PropTypes on extracted sub-components (Round 11 follow-up)**

Added `prop-types@15.8.1` and validation to every sub-component that
takes props:

- `/components/visa/{VisaBreadcrumb,CategoryTabs,CategoryDetails,
  DocsList,OtherCountries,VisaFaqSection}.jsx`
- `/components/application/{ApplicationHero,
  ApplicationTimelineSection}.jsx`
- `/components/account/ScansTab.jsx`

`AssistCard.jsx` and `WhatsNextCard.jsx` have no props, so no import.

**Testing (iteration_8.json)**: **83/83 backend tests pass** (8 new
scans tests + 75 Round 10/11 regression). **Frontend 100%** — every
documented testid renders; zero PropTypes runtime errors on /visa/* or
/account?tab=scans.


### Round 11 — Password-based admin auth + richer country CRUD + component refactor (this round)

**1. Password-based admin auth (new /admin/{login,signup,forgot-password,reset-password})**

Backend — new files:
- `/app/backend/admin_auth.py` — bcrypt hashing (cost 12), JWT with `role=admin`
  claim, `secrets.token_urlsafe(32)` reset tokens stored as SHA-256 hashes with
  30-minute TTL, simple Mongo-backed lockout (5 attempts / 15 min), optional
  SMTP reset-email helper with dev-mode fallback.
- `/app/backend/routes_admin_auth.py` — `/api/admin-auth/{signup,login,
  forgot-password,reset-password,change-password,me}` + `ensure_seed_admin()`
  bootstrap.
- `/app/backend/routes_admin.py::get_current_admin` now delegates to
  `admin_auth.get_current_admin_flex` so admin routes accept EITHER:
    • an admin JWT (role=admin), OR
    • a user OTP JWT whose email is in `ADMIN_EMAILS` (legacy compat).

`.env` additions: `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD`, `ADMIN_SEED_NAME`,
`RESET_TOKEN_TTL_MINUTES`. Super admin is seeded on startup and is the
password owner for `admin@wehive.co.in / Wehive@Admin2026`.

Frontend — new files:
- `/app/frontend/src/context/AdminAuthContext.jsx` — owns `wehive_admin_token`
  in localStorage (separate from the regular user `wehive_token`).
- `/app/frontend/src/pages/Admin.jsx` — nested routes: `/admin/{login,signup,
  forgot-password,reset-password}` are public, everything else sits behind a
  `<ProtectedAdmin>` guard that redirects to `/admin/login`.
- `/app/frontend/src/pages/{AdminLogin,AdminSignup,AdminForgotPassword,
  AdminResetPassword}.jsx` — dark-theme, minimalist auth screens with
  `AdminAuthShell`, `Field`, `PasswordStrength`, `PrimaryButton`,
  `ErrorMessage` primitives.
- SMTP dev-mode: when `SMTP_PASSWORD` is placeholder, the API returns
  `{dev_mode:true, dev_token, dev_link}` and the UI renders a clickable
  `/admin/reset-password?token=…` anchor inside an amber banner.

**2. Richer visa-type CRUD in admin CountriesTab**

- Add / remove visa types (presets: Tourist, Business, Student, Work, Transit,
  Medical + custom name).
- Per-category fields: Display name, Validity, Govt fees (INR), Govt fees
  (USD), Processing days, Multi-entry toggle, Required documents (one per
  line textarea).
- `PATCH /api/admin/countries/{id}` now auto-syncs `visa_types` from
  `categories.keys()` so the public filter dropdowns always match.
- Country-level edits: standard/rush days, same-day flag, appointment
  toggle + INR fee.

**3. Component refactor (P2 from handoff)**

- `VisaDetail.jsx` 377 → 136 lines. Extracted under
  `/app/frontend/src/components/visa/`:
  `VisaBreadcrumb`, `CategoryTabs`, `CategoryDetails`, `DocsList`,
  `AssistCard`, `VisaFaqSection`, `OtherCountries`.
- `ApplicationDetail.jsx` 256 → 152 lines. Extracted under
  `/app/frontend/src/components/application/`:
  `ApplicationHero`, `WhatsNextCard`, `ApplicationTimelineSection`.

**Testing (iteration_7.json):** **75/75 backend tests** pass (21 new admin-auth
password + 54 regression); frontend ~96% — every documented testid/flow works;
only nit was an empty `href` on the dev-mode reset link, which is now fixed.


### Round 10 — Super Admin Dashboard + editable profile fix (this round)

**New `/admin` dashboard** (admin-gated via `ADMIN_EMAILS` in `backend/.env`).
Dark-theme premium UI at `/admin/*` with a sidebar and seven tabs:

1. **Overview** — metric cards (users, applications, revenue ₹, countries),
   14-day twin sparkline (apps + signups), top-5 destinations leaderboard,
   draft/review/approved/rejected status cards.
2. **Users** — paginated list with search + role filter (all/premium/staff/admin),
   one-click toggles for `is_premium`, `is_staff`, `is_admin`, and delete.
3. **Applications** — filter by status + text search, inline status dropdown that
   appends a timeline event, revenue column (recomputed server-side using the
   same tier-based base-fee logic as `FeeBreakdown`).
4. **Countries** — list of all 250, inline editor for `delivery.standard_days`,
   `rush_days`, `same_day`, `requires_appointment`, `appointment_fee_inr`, and
   per-category pricing (`fees_inr`, `processing_days`, `validity`).
5. **Staff** — onboard consultants/reviewers/support/ops/managers by email.
   Seeded user gets `is_staff=true`, `staff_role=<role>`.
6. **Integrations** — live status of Twilio (SID masked), SMTP, Emergent LLM,
   and a one-click switcher for `OTP_CHANNEL` (mock/auto/twilio_sms/
   twilio_whatsapp/email).
7. **Exports** — one-click CSV downloads for `users`, `applications`,
   `countries`, and `revenue` (billable apps only: submitted + review + approved).

**Backend** (`/app/backend/routes_admin.py`):
- `GET /api/admin/me` · `GET /api/admin/metrics`
- `GET/PATCH/DELETE /api/admin/users[…]`
- `POST /api/admin/staff`
- `GET/PATCH /api/admin/applications[…]` (PATCH auto-appends timeline event)
- `GET/PATCH /api/admin/countries[…]`
- `GET/PATCH /api/admin/integrations` (PATCH writes MongoDB `settings`
  collection + mutates `os.environ[OTP_CHANNEL]` live)
- `GET /api/admin/export/{users|applications|countries|revenue}.csv`
- `get_current_admin` dependency: allows caller if email ∈ `ADMIN_EMAILS`
  OR `users.is_admin == true`. Non-admin → `403 Admin access required`.
- `PublicUser` extended with `is_admin`, `is_staff`, `staff_role` so
  `/api/auth/me` & `/api/auth/verify-otp` now expose these to the SPA.
- `PUT /api/users/me` now catches `pymongo.errors.DuplicateKeyError` and
  returns `409 Conflict` ("That email/phone is already linked to another
  account.") instead of bubbling a 500.

**Frontend**:
- `/app/frontend/src/pages/Admin.jsx` — nested routes, guard that shows
  `admin-forbidden` screen for non-admins.
- `/app/frontend/src/components/admin/*.jsx` — `AdminShell`,
  `OverviewTab`, `UsersTab`, `ApplicationsTab`, `CountriesTab`, `StaffTab`,
  `IntegrationsTab`, `ExportsTab`.
- `/app/frontend/src/lib/admin.js` — axios client + `downloadCsv` helper.
- `UserMenu` shows a **"Super admin"** link with `data-testid=usermenu-admin`
  only when `user.is_admin === true`. Trigger button gets
  `data-testid=usermenu-trigger`.
- `Account.jsx` profile tab: fixed PATCH → PUT (matching backend route);
  Edit profile is now fully functional (name / email / phone / gender).

**Env additions** (`backend/.env`):
- `ADMIN_EMAILS="admin@wehive.co.in,krishnakranthiteja@gmail.com"`

**Testing** (iteration_6): **55/55 backend + 13/13 frontend acceptance items
passing**. See `/app/backend/tests/test_admin_dashboard.py` for 22 new
admin-specific pytest cases.


### Round 7 — Fee-breakdown labels localised
- Added i18n keys for every string inside `FeeBreakdown.jsx` — `fee.applicants`,
  `fee.heading`, `fee.currencyNote`, `fee.application`,
  `fee.applicationSubEmbassy`, `fee.applicationSubFree`, `fee.appointment`,
  `fee.appointmentSub`, `fee.gst`, `fee.gstSub`, `fee.total`, `fee.totalSub`,
  `fee.noAppointment` — across all 6 languages (en / hi / te / ta / kn / bn).
- Applicant count is interpolated via `{n}` / `{s}` placeholders for proper
  singular / plural handling. Amounts stay in `₹` with `en-IN` formatting.
- Added `chatbot.placeholder` / `chatbot.start` for future chat widget use.
- Verified visually in Hindi and Tamil: all four fee-row labels + applicants
  stepper labels + total row translate correctly; ₹ amounts unchanged.

## Test credentials
See `/app/memory/test_credentials.md`.
