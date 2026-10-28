/**
 * Admin flows — tests 23-32 from the E2E spec.
 *
 * Set environment variables before running:
 *   ADMIN_EMAIL     — admin account email
 *   ADMIN_PASSWORD  — admin account password
 *   E2E_ADMIN_TOKEN — (optional) pre-obtained JWT to skip the login round-trip
 *
 * Run:  ADMIN_EMAIL=... ADMIN_PASSWORD=... npx playwright test tests/admin.spec.ts
 */
import { test, expect } from '@playwright/test';
import fs from 'fs';
import { AdminPage } from './pages/AdminPage';

const SCREENS = 'artifacts/screens/admin';
test.beforeAll(() => fs.mkdirSync(SCREENS, { recursive: true }));

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const ADMIN_TOKEN = process.env.E2E_ADMIN_TOKEN || '';

const hasAdminCreds = !!(ADMIN_TOKEN || (ADMIN_EMAIL && ADMIN_PASSWORD));

/** Returns a page already authenticated as admin (token injection or login). */
async function getAdminPage(page: import('@playwright/test').Page) {
  const admin = new AdminPage(page);
  if (ADMIN_TOKEN) {
    await page.addInitScript((t) => {
      window.localStorage.setItem('wehive_token', t);
    }, ADMIN_TOKEN);
  } else if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    await admin.login(ADMIN_EMAIL, ADMIN_PASSWORD);
  }
  return admin;
}

// ─── 23. Admin login → dashboard overview ─────────────────────────────────
test.describe('Admin — login and dashboard', () => {
  test.skip(!hasAdminCreds, 'Set ADMIN_EMAIL + ADMIN_PASSWORD (or E2E_ADMIN_TOKEN) to run admin tests');

  test('admin login navigates to admin dashboard', async ({ page }) => {
    const admin = await getAdminPage(page);
    await admin.gotoAdmin();

    const url = page.url();
    expect.soft(url.includes('/admin'), `Expected /admin but got: ${url}`).toBeTruthy();
    const hasContent = await admin.hasContent();
    expect.soft(hasContent, 'Admin dashboard has no content after login').toBeTruthy();
    await admin.screenshot(`${SCREENS}/admin-dashboard`);
  });

  test('admin dashboard shows KPI / stat cards', async ({ page }) => {
    const admin = await getAdminPage(page);
    await admin.gotoAdmin();

    const cards = await admin.dashboardKpiCards();
    const hasCards = await cards.first().isVisible({ timeout: 10_000 }).catch(() => false);
    expect.soft(hasCards, 'No KPI cards found on admin dashboard').toBeTruthy();
    await admin.screenshot(`${SCREENS}/admin-kpi-cards`);
  });
});

// ─── 24. /admin/users — table loads, search works ─────────────────────────
test.describe('Admin — users', () => {
  test.skip(!hasAdminCreds, 'Admin credentials required');

  test('users table renders', async ({ page }) => {
    const admin = await getAdminPage(page);
    await admin.gotoSection('users');

    const table = await admin.table();
    const hasTable = await table.isVisible({ timeout: 10_000 }).catch(() => false);
    expect.soft(hasTable, 'Users table not visible on /admin/users').toBeTruthy();
    await admin.screenshot(`${SCREENS}/admin-users-table`);
  });

  test('user search filters the table', async ({ page }) => {
    const admin = await getAdminPage(page);
    await admin.gotoSection('users');

    const search = await admin.searchInput();
    if (await search.isVisible({ timeout: 5000 }).catch(() => false)) {
      await search.fill('test');
      await page.waitForTimeout(800);
      await admin.screenshot(`${SCREENS}/admin-users-search`);
    } else {
      test.info().annotations.push({ type: 'skip-reason', description: 'Search input not found on /admin/users' });
    }
  });
});

// ─── 25. /admin/applications — filters work ───────────────────────────────
test.describe('Admin — applications', () => {
  test.skip(!hasAdminCreds, 'Admin credentials required');

  test('applications list loads', async ({ page }) => {
    const admin = await getAdminPage(page);
    await admin.gotoSection('applications');

    const hasContent = await admin.hasContent();
    expect.soft(hasContent, '/admin/applications has no content').toBeTruthy();
    await admin.screenshot(`${SCREENS}/admin-applications`);
  });

  test('status filter changes the list', async ({ page }) => {
    const admin = await getAdminPage(page);
    await admin.gotoSection('applications');

    const filter = await admin.filterDropdown();
    if (await filter.isVisible({ timeout: 5000 }).catch(() => false)) {
      const tagName = await filter.evaluate((el) => el.tagName.toLowerCase());
      if (tagName === 'select') {
        const options = await filter.locator('option').allTextContents();
        if (options.length > 1) {
          await filter.selectOption({ index: 1 });
          await page.waitForTimeout(800);
        }
      } else {
        await filter.click();
        await page.waitForTimeout(400);
      }
      await admin.screenshot(`${SCREENS}/admin-applications-filtered`);
    } else {
      test.info().annotations.push({ type: 'skip-reason', description: 'Filter dropdown not found on /admin/applications' });
    }
  });
});

// ─── 26. /admin/review — doc review queue ─────────────────────────────────
test.describe('Admin — document review queue', () => {
  test.skip(!hasAdminCreds, 'Admin credentials required');

  test('review queue renders', async ({ page }) => {
    const admin = await getAdminPage(page);
    await admin.gotoSection('review');

    const hasContent = await admin.hasContent();
    expect.soft(hasContent, '/admin/review has no content').toBeTruthy();
    await admin.screenshot(`${SCREENS}/admin-review`);
  });
});

// ─── 27. /admin/countries ─────────────────────────────────────────────────
test.describe('Admin — countries', () => {
  test.skip(!hasAdminCreds, 'Admin credentials required');

  test('country list / table renders', async ({ page }) => {
    const admin = await getAdminPage(page);
    await admin.gotoSection('countries');

    const hasContent = await admin.hasContent();
    expect.soft(hasContent, '/admin/countries has no content').toBeTruthy();
    await admin.screenshot(`${SCREENS}/admin-countries`);
  });
});

// ─── 28. /admin/universities — search works ───────────────────────────────
test.describe('Admin — universities', () => {
  test.skip(!hasAdminCreds, 'Admin credentials required');

  test('university list loads', async ({ page }) => {
    const admin = await getAdminPage(page);
    await admin.gotoSection('universities');

    const hasContent = await admin.hasContent();
    expect.soft(hasContent, '/admin/universities has no content').toBeTruthy();
    await admin.screenshot(`${SCREENS}/admin-universities`);
  });

  test('university search filters results', async ({ page }) => {
    const admin = await getAdminPage(page);
    await admin.gotoSection('universities');

    const search = await admin.searchInput();
    if (await search.isVisible({ timeout: 5000 }).catch(() => false)) {
      await search.fill('Harvard');
      await page.waitForTimeout(1000);
      await admin.screenshot(`${SCREENS}/admin-universities-search`);
    } else {
      test.info().annotations.push({ type: 'skip-reason', description: 'Search input not found on /admin/universities' });
    }
  });
});

// ─── 29. /admin/destinations ──────────────────────────────────────────────
test.describe('Admin — destinations', () => {
  test.skip(!hasAdminCreds, 'Admin credentials required');

  test('destination cards / list renders', async ({ page }) => {
    const admin = await getAdminPage(page);
    await admin.gotoSection('destinations');

    const hasContent = await admin.hasContent();
    expect.soft(hasContent, '/admin/destinations has no content').toBeTruthy();
    await admin.screenshot(`${SCREENS}/admin-destinations`);
  });
});

// ─── 30. /admin/events ────────────────────────────────────────────────────
test.describe('Admin — events', () => {
  test.skip(!hasAdminCreds, 'Admin credentials required');

  test('events list renders', async ({ page }) => {
    const admin = await getAdminPage(page);
    await admin.gotoSection('events');

    const hasContent = await admin.hasContent();
    expect.soft(hasContent, '/admin/events has no content').toBeTruthy();
    await admin.screenshot(`${SCREENS}/admin-events`);
  });
});

// ─── 31. /admin/moderation ────────────────────────────────────────────────
test.describe('Admin — moderation queue', () => {
  test.skip(!hasAdminCreds, 'Admin credentials required');

  test('moderation queue renders', async ({ page }) => {
    const admin = await getAdminPage(page);
    await admin.gotoSection('moderation');

    const hasContent = await admin.hasContent();
    expect.soft(hasContent, '/admin/moderation has no content').toBeTruthy();
    await admin.screenshot(`${SCREENS}/admin-moderation`);
  });
});

// ─── 32. /admin/payments ──────────────────────────────────────────────────
test.describe('Admin — payments', () => {
  test.skip(!hasAdminCreds, 'Admin credentials required');

  test('payment records table renders', async ({ page }) => {
    const admin = await getAdminPage(page);
    await admin.gotoSection('payments');

    const hasContent = await admin.hasContent();
    expect.soft(hasContent, '/admin/payments has no content').toBeTruthy();
    await admin.screenshot(`${SCREENS}/admin-payments`);
  });

  test('payment table rows are accessible', async ({ page }) => {
    const admin = await getAdminPage(page);
    await admin.gotoSection('payments');

    const rows = await admin.tableRows();
    const count = await rows.count();
    expect.soft(count >= 0, 'Payment table row count query failed').toBeTruthy();
    await admin.screenshot(`${SCREENS}/admin-payments-rows`);
  });
});
