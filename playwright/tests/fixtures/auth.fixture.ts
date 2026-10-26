import { test as base, Page } from '@playwright/test';

export type AuthFixtures = {
  /** Page pre-seeded with a user auth token (skips test if E2E_AUTH_TOKEN unset) */
  authedPage: Page;
  /** Page pre-seeded with admin credentials via localStorage (skips if E2E_ADMIN_TOKEN unset) */
  adminAuthedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authedPage: async ({ page }, use) => {
    const token = process.env.E2E_AUTH_TOKEN || '';
    if (!token) {
      test.skip(true, 'E2E_AUTH_TOKEN not set — skipping authenticated test');
    }
    await page.addInitScript((t) => {
      window.localStorage.setItem('wehive_token', t);
    }, token);
    await use(page);
  },

  adminAuthedPage: async ({ page }, use) => {
    const token = process.env.E2E_ADMIN_TOKEN || '';
    if (!token) {
      test.skip(true, 'E2E_ADMIN_TOKEN not set — skipping admin authenticated test');
    }
    await page.addInitScript((t) => {
      window.localStorage.setItem('wehive_token', t);
    }, token);
    await use(page);
  },
});

export { expect } from '@playwright/test';
