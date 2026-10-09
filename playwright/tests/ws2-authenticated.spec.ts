import { test, expect } from '@playwright/test';

// Auth token for an existing (throwaway) test account. Never hard-code tokens here.
const REUSED_TOKEN = process.env.E2E_AUTH_TOKEN || '';

test.describe('WS2 — authenticated areas (reused throwaway session)', () => {
  test.skip(!REUSED_TOKEN, 'E2E_AUTH_TOKEN not set');

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
