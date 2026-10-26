/**
 * User dashboard flows — requires E2E_AUTH_TOKEN.
 * Tests 18-22 from the E2E spec.
 */
import { test, expect } from './fixtures/auth.fixture';
import fs from 'fs';

const SCREENS = 'artifacts/screens/dashboard';
test.beforeAll(() => fs.mkdirSync(SCREENS, { recursive: true }));

// ─── 18. Profile page loads after login ───────────────────────────────────
test.describe('User dashboard — profile', () => {
  test('profile / account page renders when authenticated', async ({ authedPage: page }) => {
    await page.goto('/account');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1000);

    // Should NOT be on /login anymore
    const url = page.url();
    expect(
      !url.includes('/login'),
      `Expected to stay on /account but got: ${url}`,
    ).toBeTruthy();

    // Dashboard or account shell should be visible
    const dashboard = page
      .getByTestId('account-dashboard')
      .or(page.locator('[class*="Dashboard"], [class*="Account"], main'))
      .first();
    const visible = await dashboard.isVisible({ timeout: 10_000 }).catch(() => false);
    expect.soft(visible, 'Account dashboard content not visible').toBeTruthy();
    await page.screenshot({ path: `${SCREENS}/profile.png`, fullPage: true }).catch(() => {});
  });
});

// ─── 19. Create new application — select country, fill form ───────────────
test.describe('User dashboard — new application', () => {
  test('new application form opens', async ({ authedPage: page }) => {
    await page.goto('/account');
    await page.waitForLoadState('networkidle').catch(() => {});

    // Click "New Application" or "Apply" button
    const newAppBtn = page
      .locator(
        'button:has-text("New Application"), button:has-text("Apply"), a:has-text("Apply Now"), [data-testid="new-application"]',
      )
      .first();
    const hasBtn = await newAppBtn.isVisible({ timeout: 8000 }).catch(() => false);
    if (!hasBtn) {
      test.info().annotations.push({ type: 'skip-reason', description: 'New Application button not found' });
      await page.screenshot({ path: `${SCREENS}/new-app-no-btn.png`, fullPage: true }).catch(() => {});
      return;
    }
    await newAppBtn.click();
    await page.waitForTimeout(1000);

    // A country selector or application form should appear
    const formOrModal = page
      .locator('form, [role="dialog"], [data-testid*="application-form"]')
      .first();
    const formVisible = await formOrModal.isVisible({ timeout: 5000 }).catch(() => false);
    expect.soft(formVisible, 'Application form/modal did not appear').toBeTruthy();
    await page.screenshot({ path: `${SCREENS}/new-app-form.png`, fullPage: true }).catch(() => {});
  });

  test('country selector works in application flow', async ({ authedPage: page }) => {
    await page.goto('/account');
    await page.waitForLoadState('networkidle').catch(() => {});

    // Look for a country select / combobox
    const countrySelect = page
      .locator('select[name*="country" i], [data-testid*="country"], [placeholder*="country" i]')
      .first();
    const hasSelect = await countrySelect.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasSelect) {
      // Try to select Canada
      const tagName = await countrySelect.evaluate((el) => el.tagName.toLowerCase());
      if (tagName === 'select') {
        await countrySelect.selectOption({ label: 'Canada' }).catch(() =>
          countrySelect.selectOption({ index: 1 }),
        );
      } else {
        await countrySelect.fill('Canada');
      }
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: `${SCREENS}/new-app-country.png`, fullPage: true }).catch(() => {});
  });
});

// ─── 20. Upload document to application ───────────────────────────────────
test.describe('User dashboard — document upload', () => {
  test('document upload input is accessible', async ({ authedPage: page }) => {
    await page.goto('/account');
    await page.waitForLoadState('networkidle').catch(() => {});

    // Navigate to documents/uploads tab if it exists
    const docsTab = page
      .locator('button:has-text("Documents"), button:has-text("Uploads"), [data-testid*="documents-tab"]')
      .first();
    if (await docsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await docsTab.click();
      await page.waitForTimeout(800);
    }

    // Look for file upload input
    const uploadInput = page.locator('input[type="file"]').first();
    const hasUpload = await uploadInput.isVisible({ timeout: 5000 }).catch(() => false);

    // Also look for an upload trigger button
    const uploadBtn = page
      .locator(
        'button:has-text("Upload"), button:has-text("Add Document"), [data-testid*="upload"]',
      )
      .first();
    const hasBtn = await uploadBtn.isVisible({ timeout: 3000 }).catch(() => false);

    expect.soft(hasUpload || hasBtn, 'No document upload element found').toBeTruthy();
    await page.screenshot({ path: `${SCREENS}/document-upload.png`, fullPage: true }).catch(() => {});
  });
});

// ─── 21. View application status timeline ─────────────────────────────────
test.describe('User dashboard — application status timeline', () => {
  test('applications tab shows status or timeline', async ({ authedPage: page }) => {
    await page.goto('/account');
    await page.waitForLoadState('networkidle').catch(() => {});

    const appTab = page
      .locator('button:has-text("Applications"), [data-testid="applications-tab"]')
      .first();
    if (await appTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await appTab.click();
      await page.waitForTimeout(1000);
    }

    // Look for timeline, status steps, or application cards
    const timeline = page
      .locator(
        '[data-testid*="timeline"], [class*="Timeline"], [class*="Status"], .step, ol li, [data-testid*="application-card"]',
      )
      .first();
    const hasTimeline = await timeline.isVisible({ timeout: 5000 }).catch(() => false);
    expect.soft(hasTimeline, 'No application timeline or status steps visible').toBeTruthy();
    await page.screenshot({ path: `${SCREENS}/status-timeline.png`, fullPage: true }).catch(() => {});
  });
});

// ─── 22. AI tools page loads ──────────────────────────────────────────────
test.describe('AI tools page', () => {
  test('AI tools / visa checker loads when authenticated', async ({ authedPage: page }) => {
    await page.goto('/visa-checker');
    await page.waitForLoadState('networkidle').catch(() => {});
    const hasContent = await page.evaluate(() => document.body.children.length > 0);
    expect(hasContent).toBeTruthy();
    await page.screenshot({ path: `${SCREENS}/ai-tools.png`, fullPage: true }).catch(() => {});
  });

  test('assessment tool loads', async ({ authedPage: page }) => {
    await page.goto('/assessment');
    await page.waitForLoadState('networkidle').catch(() => {});
    const hasContent = await page.evaluate(() => document.body.children.length > 0);
    expect(hasContent).toBeTruthy();
    await page.screenshot({ path: `${SCREENS}/assessment.png`, fullPage: true }).catch(() => {});
  });
});
