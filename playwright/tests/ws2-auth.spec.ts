import { test, expect } from '@playwright/test';

// Throwaway test account for this validation run — mailinator is a public inbox,
// no signup needed, viewable at https://www.mailinator.com/v4/public/inboxes.jsp?to=<name>
const TEST_EMAIL = `wehive-qa-${Date.now()}@mailinator.com`;
// Supply via env; tests that need a password are skipped when it is unset.
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || '';
const TEST_NAME = 'WeHive QA Bot';

test.describe('WS7 — protected route redirect', () => {
  test('unauthenticated visit to /account redirects to /login with next param', async ({ page }) => {
    await page.goto('/account');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page).toHaveURL(/\/login\?next=/);
    await page.screenshot({ path: 'artifacts/screens/ws7/protected-route-redirect.png', fullPage: true });
  });
});

test.describe('WS2 — signup negative paths', () => {
  test('empty submit shows validation, does not navigate', async ({ page }) => {
    await page.goto('/signup');
    await page.getByRole('button', { name: /email/i }).first().click().catch(() => {});
    const submit = page.getByTestId('signup-submit');
    await submit.click();
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/signup/);
    await page.screenshot({ path: 'artifacts/screens/ws2/signup-empty-submit.png', fullPage: true });
  });

  test('invalid email format is rejected', async ({ page }) => {
    test.skip(!TEST_PASSWORD, 'E2E_TEST_PASSWORD not set');
    await page.goto('/signup');
    await page.getByRole('button', { name: /email/i }).first().click();
    await page.locator('input[placeholder="e.g. Priya Sharma"]').fill(TEST_NAME);
    await page.getByTestId('email-input').fill('not-an-email');
    await page.getByTestId('password-input').fill(TEST_PASSWORD);
    await page.getByTestId('signup-submit').click();
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/\/signup/);
    await page.screenshot({ path: 'artifacts/screens/ws2/signup-invalid-email.png', fullPage: true });
  });
});

test.describe('WS2 — signup happy path + Firebase/AuthContext sync check', () => {
  test('email+password signup, and whether isAuthed reflects without a manual reload', async ({ page }) => {
    test.skip(!TEST_PASSWORD, 'E2E_TEST_PASSWORD not set');
    await page.goto('/signup');
    await page.getByRole('button', { name: /email/i }).first().click();
    await page.locator('input[placeholder="e.g. Priya Sharma"]').fill(TEST_NAME);
    await page.getByTestId('email-input').fill(TEST_EMAIL);
    await page.getByTestId('password-input').fill(TEST_PASSWORD);

    await page.screenshot({ path: 'artifacts/screens/ws2/signup-before-submit.png', fullPage: true });
    await page.getByTestId('signup-submit').click();

    // Give the Firebase signup + backend sync call time to complete
    await page.waitForTimeout(4000);
    const urlAfterSubmit = page.url();
    const hasUserMenu = await page.getByTestId('usermenu-trigger').isVisible().catch(() => false);
    const localStorageToken = await page.evaluate(() => localStorage.getItem('wehive_token'));

    await page.screenshot({ path: 'artifacts/screens/ws2/signup-immediately-after-submit.png', fullPage: true });

    console.log('=== SIGNUP RESULT (no reload) ===');
    console.log('URL:', urlAfterSubmit);
    console.log('UserMenu visible (i.e. app thinks isAuthed=true):', hasUserMenu);
    console.log('wehive_token present in localStorage:', !!localStorageToken);

    // Now reload and see if state flips to authenticated
    await page.reload();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1500);
    const hasUserMenuAfterReload = await page.getByTestId('usermenu-trigger').isVisible().catch(() => false);
    const urlAfterReload = page.url();

    await page.screenshot({ path: 'artifacts/screens/ws2/signup-after-manual-reload.png', fullPage: true });

    console.log('=== SIGNUP RESULT (after manual reload) ===');
    console.log('URL:', urlAfterReload);
    console.log('UserMenu visible after reload:', hasUserMenuAfterReload);

    test.info().annotations.push({
      type: 'finding',
      description: `isAuthed-before-reload=${hasUserMenu} isAuthed-after-reload=${hasUserMenuAfterReload} email=${TEST_EMAIL}`,
    });
  });
});
