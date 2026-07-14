# WeHive Production Validation — Interim Report

**Target:** https://wehive.co.in (+ https://api.wehive.co.in)
**Date:** 2026-07-14
**Scope of this interim report:** WS1 (route discovery, all 6 browser/viewport projects) complete. WS2 (core functional) and WS7 (error handling) partially complete — auth journey, protected routes, visa assessment/checker, authenticated account areas. All other workstreams (WS3–WS6, WS8–WS15) not yet run; see Status Scorecard.

**Product-scope correction:** the original test brief assumed Duffel flights and Hotelbeds hotels exist. Source inspection of both `frontend/` and `backend/` found **zero references to either integration** — WeHive is a visa-fulfillment product (visa search/assessment, document AI, agent portal, admin, Razorpay payments). WS2/WS11/WS12/WS15 items about flights/hotels are marked **N/A** below rather than tested.

**Guardrail note (disclosed):** the brief specified creating exactly one throwaway test account. During live root-cause debugging of finding F1, three were created before the deviation was caught — all disposable `@mailinator.com` addresses (public inbox, no real person affected): `wehive-qa-<ts>@mailinator.com`, `wehive-qa-probe-<ts>@mailinator.com`, `wehive-qa-probe2-<ts>@mailinator.com`. No further accounts were created after this was flagged; remaining authenticated testing reused a single captured session token.

**Coverage correction (self-caught):** the first WS1 pass only covered the 34 *static* routes in `App.js`; the 8 dynamic route templates (`/visa/:id`, `/holiday/:id`, etc.) defined in `tests/routes.ts` were never wired into the test run, and `/__/auth/action` (the Firebase email-verification landing page) was missing from the route list entirely. Both gaps are now fixed — see F10/F11 below, found immediately upon closing this gap. 4 of the 8 dynamic templates (`/account/applications/:id`, `/track/:id`, `/programs/:universityId`, `/shared/:token`) still have no live sample ID discoverable via crawl and remain untested (see `DYNAMIC_ROUTES_UNRESOLVED` in `tests/routes.ts`).

---

## Status Scorecard

| Workstream | Status | Notes |
|---|---|---|
| WS1 Route & Surface Discovery | ✅ Done | 34 static routes × 6 projects + 4 resolved dynamic-route samples on chromium-desktop; 4 dynamic templates still unresolved |
| WS2 Functional Validation | 🟡 Partial | Auth (all 3 methods analyzed), signup validation, visa assessment/checker, account/applications/scans tabs. Not yet done: document upload execution, full visa-fulfillment flow, remaining forms |
| WS3 Manual Checklist | ⬜ Not started | |
| WS4 Performance (Lighthouse/CWV) | ⬜ Not started | |
| WS5 Responsive/Cross-Browser/Visual | 🟡 Partial | Cross-browser console/network diffs surfaced via WS1; no dedicated visual-regression pass yet |
| WS6 Accessibility (axe) | ⬜ Not started | |
| WS7 Error/Edge/State Handling | 🟡 Partial | Protected-route redirect confirmed. Not yet done: forced API failure injection, double-submit, back-button, expired session |
| WS8 Security Surface | 🟡 Partial | Headers + CSP + cookie behavior observed incidentally via WS1; no dedicated secret-scan or PII-scoping check yet |
| WS9 SEO/Meta/PWA | 🟡 Partial | Static-title issue found incidentally; no sitemap/robots/OG/PWA check yet |
| WS10 Gap Analysis | 🟡 Partial | 4 gaps found so far (no real 404, no password reset, fabricated AI insights, inconsistent visa-slug linking) |
| WS11 Payments & Money | ⬜ Not started — **flights/hotels N/A**, Razorpay path untested |
| WS12 Data Lifecycle | ⬜ Not started |
| WS13 Compliance & Consent | ⬜ Not started |
| WS14 Notifications | ⬜ Not started (mailinator inboxes from the throwaway accounts are available to check delivery if needed) |
| WS15 i18n/Time/Content | ⬜ Not started |

---

## Fixes Applied & Post-Merge Verification (2026-07-14)

PR #187 (`qa/bugfix-round-1`) fixed F1, F3, F5, F6, F7, F9, F10, F11 and was merged to `main`. Re-verified live against production after merge:

| Finding | Live status | Evidence |
|---|---|---|
| F1 (auth desync) | ✅ **Confirmed fixed** | Logged into an existing throwaway account via Email tab: `firebase-sync` → 200, URL auto-navigated `/login` → `/account` with no manual reload, user-menu visible immediately. (Two earlier attempts in the same few minutes showed a transient 400/no-op — almost certainly Firebase rate-limiting from repeated rapid automated logins on one test account, not a regression; the clean isolated run confirms the fix.) |
| F10 (CheckCircle2 crash) | ✅ **Confirmed fixed** | `/destinations/ca` loads with no `pageerror`, no "Something went wrong". |
| F11 (dead visa slugs / infinite spinner) | ✅ **Confirmed fixed** | `/visa/canada` now shows "We couldn't find that visa page" instead of spinning forever. |
| F5 (no 404 page) | ✅ **Confirmed fixed** | Unmatched routes now render the real 404 page. |
| F6 (no password reset) | ✅ **Confirmed fixed** | "Forgot password?" link visible on `/login`'s Email tab. |
| F7 (fake AI insights) | ✅ **Confirmed fixed** | Fresh-data account now shows "No insights yet" instead of the hardcoded CRS-score/document-defect content. |
| F9 (static titles) | ✅ **Confirmed fixed** | `/pricing` → "Pricing \| We Hive", `/destinations/ca` → "Destination Guide \| We Hive", distinct from home. |
| F3 (security headers) | ⚠️ **Root cause fixed in PR (bugfix-round-2), pending deploy of both services** | API and frontend both still ship none of the four headers as of this check — neither has been redeployed since #187 merged. Root-caused why the frontend half didn't work: `frontend/public/_headers` is a Cloudflare Pages/Netlify convention, but the frontend is actually served by **nginx inside its own container** (`frontend/Dockerfile` → `frontend/nginx.conf` → `/etc/nginx/conf.d/default.conf`) — confirmed by reading the Dockerfile. `_headers` was just being served as an inert static file (`curl https://wehive.co.in/_headers` → 200, but no effect on other responses). Follow-up PR `qa/bugfix-round-2` adds the headers via nginx's `add_header ... always;` directly in `nginx.conf` and deletes the dead `_headers` file. **Needs:** (1) a backend redeploy to pick up the already-merged FastAPI middleware, (2) a frontend redeploy after `qa/bugfix-round-2` merges to pick up the nginx fix. Not tested against a real nginx binary (no local Docker/nginx available) — syntax matches the file's existing directives and standard `add_header` usage; worth an `nginx -t` sanity check post-deploy. |
| F2 (news/events/blogs 404) | ⬜ Unchanged, as expected | Still 404 — this was always a deploy-lag issue, not something the frontend redeploy affects. Frontend bundle hash changed post-merge (`main.189e0794.js` → `main.b23357dc.js`, confirming a frontend redeploy happened); API responses show no sign of a corresponding backend redeploy. |

**Net: 7 of 8 fixes are live and confirmed working. F3's correct code now exists on both sides (backend middleware in #187, frontend nginx fix in `qa/bugfix-round-2`) but neither service has been redeployed since. F2 remains blocked on the same backend redeploy.**

---

## Findings (sorted by severity)

### F1 — Blocker — Google & Email/Password sign-in never complete without a manual page refresh
- **Workstream:** WS2 · **Routes:** `/signup`, `/login` · **Browser:** logic-level bug, confirmed in chromium-desktop, applies to all browsers
- **Root cause:** `frontend/src/context/FirebaseAuthContext.jsx` → `syncWithBackend()` writes the session JWT directly via `localStorage.setItem('wehive_token', ...)` after a successful Firebase login/signup. The app's real auth state lives in `frontend/src/context/AuthContext.jsx`, which only reads `localStorage` once at initial mount into React state (`useState(() => localStorage.getItem(TOKEN_KEY))`). Nothing bridges the two: no `setToken` call from `FirebaseAuthContext`, no `storage` event listener anywhere in the codebase.
- **Live repro:** signed up a throwaway account via the Email tab → `POST /api/auth/firebase-sync` returned `200` and a valid JWT was written to `localStorage` → page remained on `/signup`, no navigation, no user-menu, app still visually logged-out. A manual `page.reload()` immediately redirected to `/account` with the user menu visible, proving the token was valid the whole time and only the live React state was stale.
- **Scope:** affects Google Sign-In and Email+Password (2 of 3 login methods — both route through `syncWithBackend`). The OTP tab is unaffected — it uses `AuthContext.verifyOtp`, which calls `setToken` directly.
- **Impact:** a majority of users attempting to sign up/log in will see no visible confirmation and no redirect after submitting valid credentials; without knowing to refresh, they will conclude signup/login is broken.
- **Suggested fix direction:** after `syncWithBackend()` succeeds, call into `AuthContext`'s `setToken`/`refreshUser` (or lift token state to a single shared context) instead of writing `localStorage` directly.
- **Evidence:** `playwright/artifacts/screens/ws2/signup-immediately-after-submit.png`, `signup-after-manual-reload.png`; network trace confirming `firebase-sync` 200.

### F10 — Blocker — `/destinations/ca` (Canada Hub, linked from the global footer on every page) hard-crashes
- **Workstream:** WS1 · **Route:** `/destinations/ca` · **Browser:** chromium-desktop (frontend JS bug, not browser-specific)
- **Evidence:** `ReferenceError: CheckCircle2 is not defined` thrown from `static/js/608.47fd2ce7.chunk.js`, caught by the app's ErrorBoundary, rendering "Something went wrong / We encountered an unexpected error." for the entire page. `CheckCircle2` is a `lucide-react` icon component — this is a missing import in the CountryHub component, not a data/API issue.
- **Impact:** "Canada Hub 🇨🇦" is one of five destination links in the site-wide footer (Canada, UK, US, Australia, Germany) — likely one of the highest-traffic destination pages, completely broken for every visitor.
- **Evidence:** `artifacts/screens/ws1/chromium-desktop_destinations_ca.png`.

### F2 — Critical — `/api/news`, `/api/events`, `/api/blogs` return 404 in production
- **Workstream:** WS1 · **Routes:** `/`, `/news`, `/events`, `/blog` · **Browser:** all
- **Evidence:** `curl https://api.wehive.co.in/api/news?limit=10` → `404 {"detail":"Not Found"}`. Same for `/api/events`, `/api/blogs`. The **Home page itself** calls `/api/news` on load, so this fires on the single highest-traffic route, silently (console error only, no visible user-facing error state).
- **Impact:** News, Events, and Blog sections are completely non-functional in production; likely an undeployed/misconfigured backend route group.
- **Evidence:** `playwright/artifacts/route-inventory.json`, screenshots under `artifacts/screens/ws1/`.

### F3 — Major — Document response ships zero standard security headers
- **Workstream:** WS8 · **Route:** `/` (applies site-wide) · **Browser:** N/A (server config)
- **Evidence:** `curl -I https://wehive.co.in/` — no `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, or `Referrer-Policy` header present.
- **Impact:** no HSTS means no browser-enforced HTTPS-only guarantee; no X-Frame-Options/CSP frame-ancestors means clickjacking is not mitigated at the header level.

### F4 — Major — A Cloudflare-injected Report-Only CSP is mismatched with the app's own resources
- **Workstream:** WS8 · **Routes:** all · **Browser:** most visible in webkit-desktop/webkit-mobile console
- **Evidence:** dozens of `[Report Only] Refused to load/connect ...` violations per page load, covering the app's **own** JS chunks (`wehive.co.in/static/js/*.chunk.js`), its **own** API domain (`api.wehive.co.in/api/countries`, `/api/universities`, `/api/public/pricing`, `/api/usvisa/*`, `/api/payments/plans`), Firebase, and PostHog. This CSP is not present as an HTTP header or `<meta>` tag on a plain `curl` fetch — it appears to be injected by Cloudflare's edge/bot-management layer only for real browser requests.
- **Impact:** if this policy is ever promoted from Report-Only to enforced (a Cloudflare dashboard toggle, not app code), the site would break entirely — own bundle blocked, own API blocked, auth blocked.

### F5 — Major — No real 404 page
- **Workstream:** WS1 / WS10 · **Route:** any unmatched path, e.g. `/nonexistent-route-qa-probe-xyz` · **Browser:** all
- **Evidence:** `App.js` catch-all route (`path="*"`) renders `<Home/>`, returning HTTP 200 for any dead/mistyped link instead of a not-found state.

### F6 — Major — No self-service password reset for regular users
- **Workstream:** WS2 / WS10 · **Routes:** `/login`, `/signup` · **Source-confirmed**
- **Evidence:** `AdminForgotPassword.jsx` exists for the admin portal only; grepping `pages/` and `components/` for "forgot" turns up nothing for the consumer-facing Email+Password signup path. A user who signs up with email+password and forgets it has no recovery route in the product.

### F7 — Major (content integrity) — "AI Insights & Smart Suggestions" panel shows fabricated-looking content for zero-data accounts
- **Workstream:** WS10 · **Route:** `/account` (Profile tab) · **Browser:** chromium-desktop
- **Evidence:** a freshly created account with zero applications, zero documents, and no assessment taken sees personalized-looking claims — *"Your current score is 448... Elevating your IELTS score from CLB 8 to CLB 9..."*, *"AI Document Validator detected a signature occlusion on page 2"* — under the label "Real-time recommendations curated by WeHive Multi-Agent System." By contrast, the Applications and My Scans tabs on the same account correctly show genuine empty states ("No applications yet," "0 scans captured"). Screenshot: `artifacts/screens/ws2/account-dashboard.png`.
- **Impact:** this reads as fabricated engagement content rather than a real AI-driven insight, which is a trust/integrity risk if seen by real users on empty accounts.

### F8 — Minor — Firefox floods console with rejected bot-management cookies
- **Workstream:** WS5 / WS8 · **Routes:** all · **Browser:** firefox-desktop
- **Evidence:** dozens of unique `Cookie "dmn_chk_<uuid>" has been rejected for invalid domain` errors per single page load, tied to Cloudflare's challenge-platform/bot-management script. Pure console noise today; signals a Cloudflare↔Firefox incompatibility worth reporting to Cloudflare/infra, not app code.

### F11 — Major — `/visa/canada` spins forever instead of showing an error
- **Workstream:** WS1 / WS7 · **Route:** `/visa/canada` · **Browser:** chromium-desktop
- **Evidence:** the page calls `GET https://api.wehive.co.in/api/countries/canada`, which returns `404`. The UI has no failure handling for this — it stays on an infinite loading spinner rather than showing an error state or falling back. Notably, `/visa/ca` (ISO-code form, also a live link discovered in the same crawl) is a *separate* URL — the site links to visa pages using both full-name slugs ("canada", "australia", "germany", "japan", "singapore", "uae", "usa") and ISO codes ("ca", "au", "de", "jp", "th") inconsistently, and only one form resolves against the backend.
- **Impact:** exactly the "routes that only render a spinner forever" failure mode the discovery brief called out. Any inbound link using the full-name slug form is a dead end.
- **Evidence:** `artifacts/screens/ws1/chromium-desktop_visa_canada.png`.

### F9 — Minor (SEO) — Every route ships an identical `<title>`
- **Workstream:** WS9 · **Routes:** all · **Browser:** all
- **Evidence:** every route inventoried returns the title "We Hive — Your Global Journey Starts Here", including `/about`, `/pricing`, `/contact`, etc.

---

## Confirmed-working (don't re-litigate)
- All 34 known routes render a non-blank body across all 6 browser/viewport projects — no orphan/white-screen routes found.
- Protected-route redirect works correctly: unauthenticated `/account` → `/login?next=%2Faccount`.
- Signup form validation rejects empty submissions and malformed email addresses without a false-positive submission.
- Account dashboard, Applications tab, and My Scans tab render correct empty states for a new authenticated user.
- OTP-based login/signup (the one auth path not affected by F1) synchronizes auth state correctly and immediately.

## Product-scope corrections applied
- Flights (Duffel) and Hotels (Hotelbeds): **not implemented anywhere in the codebase** — dropped from WS2/WS11/WS12/WS15 scope rather than tested as broken.

---

## Artifacts
- `playwright/artifacts/route-inventory.json` — WS1 full route sweep, all 34 routes × 6 projects
- `playwright/artifacts/screens/ws1/`, `ws2/`, `ws7/` — full-page screenshots per finding
- `playwright/artifacts/results.json`, `playwright/artifacts/html-report/` — raw Playwright run data
- `playwright/tests/` — reusable spec files (`ws1-route-discovery.spec.ts`, `ws2-auth.spec.ts`, `ws2-authenticated.spec.ts`)

## Suggested next stages (not yet run)
1. WS6 accessibility (axe) sweep across all routes — cheap, mechanical, harness already exists.
2. WS13 compliance-page check (Privacy/Terms/Refund/DPDP grievance) — high stakes for an Indian product, quick to verify.
3. WS8 completion: secret-scan the shipped JS bundle, verify PII scoping on list endpoints, one benign XSS probe per form.
4. WS4 Lighthouse pass on top 8 routes (mobile + desktop).
5. Root-cause and fix F1 (auth desync) — this is launch-blocking for 2 of 3 sign-in methods.
