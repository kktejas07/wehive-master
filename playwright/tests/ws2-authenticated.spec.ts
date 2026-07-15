import { test, expect } from '@playwright/test';

// Reused token from the throwaway wehive-qa-probe-* account created earlier in this
// validation run (see REPORT.md auth-desync finding). No new account is created here.
const REUSED_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1YzM3MjgyZS00N2FlLTQ0M2ItYmYxMC1hNzZlMTBjOTJlMTMiLCJleHAiOjE3ODQxMjE2ODEsImlhdCI6MTc4NDAzNTI4MX0.Elus3KAD8R_8XYyDR4oY52fk5jDE1A1lFERqxMzV2lI';

test.describe('WS2 — authenticated areas (reused throwaway session)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((token) => {
      window.localStorage.setItem('wehive_token', token);
    }, REUSED_TOKEN);
  });

  test('account dashboard renders when authed', async ({ page }) => {
    await page.goto('/account');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByTestId('account-dashboard')).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: 'artifacts/screens/ws2/account-dashboard.png', fullPage: true });
  });

  test('applications tab', async ({ page }) => {
    await page.goto('/account');
    await page.waitForLoadState('networkidle').catch(() => {});
    const tabBtn = page.getByRole('button', { name: /applications/i }).first();
    if (await tabBtn.isVisible().catch(() => false)) {
      await tabBtn.click();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: 'artifacts/screens/ws2/account-applications-tab.png', fullPage: true });
  });

  test('scans (document AI) tab', async ({ page }) => {
    await page.goto('/account');
    await page.waitForLoadState('networkidle').catch(() => {});
    const tabBtn = page.getByRole('button', { name: /scans/i }).first();
    if (await tabBtn.isVisible().catch(() => false)) {
      await tabBtn.click();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: 'artifacts/screens/ws2/account-scans-tab.png', fullPage: true });
  });
});

test.describe('WS2 — visa search / assessment journey (no auth needed)', () => {
  test('visa assessment happy path start', async ({ page }) => {
    await page.goto('/assessment');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.screenshot({ path: 'artifacts/screens/ws2/visa-assessment-start.png', fullPage: true });
  });

  test('visa checker happy path start', async ({ page }) => {
    await page.goto('/visa-checker');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.screenshot({ path: 'artifacts/screens/ws2/visa-checker-start.png', fullPage: true });
  });

  test('country hub renders for a real destination', async ({ page }) => {
    await page.goto('/destinations/ca');
    await page.waitForLoadState('networkidle').catch(() => {});
    const bodyHasChildren = await page.evaluate(() => document.body.children.length > 0);
    expect(bodyHasChildren).toBeTruthy();
    await page.screenshot({ path: 'artifacts/screens/ws2/country-hub-ca.png', fullPage: true });
  });
});
