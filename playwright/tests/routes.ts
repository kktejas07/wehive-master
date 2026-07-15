// Ground truth extracted from frontend/src/App.js (react-router route table).
// Dynamic segments get a placeholder; WS1 will try to discover a real value via crawl,
// falling back to marking the route "requires sample id" if none is found.
export type RouteDef = {
  path: string;
  dynamic: boolean;
  requiresAuth: boolean;
  note?: string;
};

export const STATIC_ROUTES: RouteDef[] = [
  { path: '/', dynamic: false, requiresAuth: false },
  { path: '/about', dynamic: false, requiresAuth: false },
  { path: '/pricing', dynamic: false, requiresAuth: false },
  { path: '/login', dynamic: false, requiresAuth: false },
  { path: '/signup', dynamic: false, requiresAuth: false },
  { path: '/account', dynamic: false, requiresAuth: true },
  { path: '/track', dynamic: false, requiresAuth: false },
  { path: '/assessment', dynamic: false, requiresAuth: false },
  { path: '/visa-interview-sandbox', dynamic: false, requiresAuth: false },
  { path: '/help', dynamic: false, requiresAuth: false },
  { path: '/contact', dynamic: false, requiresAuth: false },
  { path: '/student-visa', dynamic: false, requiresAuth: false },
  { path: '/visa-interview', dynamic: false, requiresAuth: false },
  { path: '/universities', dynamic: false, requiresAuth: false, note: 'redirects to /student-visa' },
  { path: '/map', dynamic: false, requiresAuth: false },
  { path: '/resources', dynamic: false, requiresAuth: false },
  { path: '/intake-calendar', dynamic: false, requiresAuth: false },
  { path: '/financial-tools', dynamic: false, requiresAuth: false },
  { path: '/agent-training', dynamic: false, requiresAuth: false },
  { path: '/emergency', dynamic: false, requiresAuth: false },
  { path: '/visa-scheduling', dynamic: false, requiresAuth: false },
  { path: '/visa-checker', dynamic: false, requiresAuth: false },
  { path: '/events', dynamic: false, requiresAuth: false },
  { path: '/blog', dynamic: false, requiresAuth: false },
  { path: '/news', dynamic: false, requiresAuth: false },
  { path: '/hive', dynamic: false, requiresAuth: false },
  { path: '/us-visa-slots', dynamic: false, requiresAuth: false },
  { path: '/agent-portal/login', dynamic: false, requiresAuth: false },
  { path: '/agent', dynamic: false, requiresAuth: 'unknown' as any, note: 'wildcard /agent/* portal root' },
  { path: '/admin', dynamic: false, requiresAuth: 'unknown' as any, note: 'wildcard /admin/* — has own client-side ProtectedAdmin guard' },
  { path: '/nonexistent-route-qa-probe-xyz', dynamic: false, requiresAuth: false, note: '404/catch-all probe (App.js sends unmatched paths to Home, not a real 404 page)' },
  { path: '/__/auth/action', dynamic: false, requiresAuth: false, note: 'Firebase email-verification / password-action landing page (App.js:97) — no query params, so this hits it with none set' },
];

// Real sample IDs pulled from live crawl (route-inventory.json discoveredLinks), not guessed —
// guessed slugs would misreport as false 404s. See DYNAMIC_ROUTES_UNRESOLVED for ones we
// couldn't find a live sample for.
export const DYNAMIC_ROUTES_RESOLVED: RouteDef[] = [
  { path: '/visa/canada', dynamic: true, requiresAuth: false, note: 'sample for /visa/:id' },
  { path: '/holiday/bb', dynamic: true, requiresAuth: false, note: 'sample for /holiday/:id' },
  { path: '/destinations/ca', dynamic: true, requiresAuth: false, note: 'sample for /destinations/:countryId' },
  { path: '/university/harvard', dynamic: true, requiresAuth: false, note: 'sample for /university/:id' },
];

// Templates where no live sample link was discoverable via crawl (checked: homepage, /about,
// /university/harvard). Left unresolved rather than guessed — needs either a deeper crawl pass
// (e.g. from within an authenticated application flow) or a manually supplied real ID.
export const DYNAMIC_ROUTES_UNRESOLVED: RouteDef[] = [
  { path: '/account/applications/:id', dynamic: true, requiresAuth: true, note: 'needs a real application id — test account has 0 applications' },
  { path: '/track/:id', dynamic: true, requiresAuth: false, note: 'needs a real tracking id from a submitted application' },
  { path: '/programs/:universityId', dynamic: true, requiresAuth: false, note: 'no discoverable link from /university/harvard — may be a JS-only navigate(), not an <a href>' },
  { path: '/shared/:token', dynamic: true, requiresAuth: false, note: 'needs a real shortlist share token generated via the share action' },
];
