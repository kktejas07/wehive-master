import { test as base, expect, Page, Route } from '@playwright/test';

/**
 * Shared fixtures for the web + mobile-web E2E suite.
 *
 * Every backend call (`/api/...` on a non-app origin) is intercepted: tests register
 * handlers with `api.on(method, pathRegex, json)`, anything unregistered gets a 404 so no
 * test depends on (or writes to) a real backend. Uncaught page errors fail the test.
 */

type Handler = { method: string; path: RegExp; status: number; json: unknown };

export class ApiMock {
  private handlers: Handler[] = [];
  readonly calls: { method: string; path: string; body: unknown }[] = [];

  on(method: string, path: RegExp, json: unknown, status = 200) {
    this.handlers.unshift({ method, path, status, json });
    return this;
  }

  async handle(route: Route) {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/^\/api/, '');
    this.calls.push({ method: req.method(), path, body: req.postData() && JSON.parse(req.postData()!) });
    const h = this.handlers.find((x) => x.method === req.method() && x.path.test(path));
    return route.fulfill(h ? { status: h.status, json: h.json } : { status: 404, json: { detail: 'not mocked' } });
  }
}

export const TEST_USER = { id: 'u-e2e-1', email: 'e2e.student@example.com', name: 'E2E Student' };

/** Seed a session token and mock the endpoints AuthContext/Account need. */
export async function signIn(page: Page, api: ApiMock, user = TEST_USER) {
  api
    .on('GET', /^\/(auth|users)\/me$/, user)
    .on('GET', /^\/users\/me\/(applications|saved-plans|profile-requests)$/, [])
    .on('GET', /^\/referrals\/(my-code|stats)$/, {});
  await page.addInitScript(() => window.localStorage.setItem('wehive_token', 'e2e-token'));
}

export const test = base.extend<{ api: ApiMock; pageErrors: Error[] }>({
  api: [
    async ({ page, baseURL }, use) => {
      const api = new ApiMock();
      const appOrigin = new URL(baseURL!).origin;
      await page.route((url) => url.origin !== appOrigin && url.pathname.startsWith('/api/'), (r) => api.handle(r));
      await page.route(/posthog|googletagmanager|google-analytics|emergent/, (r) => r.abort('blockedbyclient'));
      await use(api);
    },
    { auto: true },
  ],
  pageErrors: [
    async ({ page }, use) => {
      const errors: Error[] = [];
      // WebKit reports XHRs cancelled by a navigation as "...due to access control checks" — not an app error.
      page.on('pageerror', (e) => { if (!/due to access control checks/.test(e.message)) errors.push(e); });
      await use(errors);
      expect(errors.map((e) => e.message), 'uncaught page errors').toEqual([]);
    },
    { auto: true },
  ],
});

/** Phone/tablet projects get the hamburger menu (navbar collapses below `lg`). */
export const isCollapsedNav = (page: Page) => (page.viewportSize()?.width ?? 1280) < 1024;

export { expect };
