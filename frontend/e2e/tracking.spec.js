import { test, expect } from '@playwright/test';

test.describe('Application Tracking Flow', () => {
  test('Track Application Successfully', async ({ page }) => {
    // Assuming the user navigates to the tracking portal
    await page.goto('/track'); // Adjust route if it's different in App.js (e.g. /track/:id)
    
    // We mock the API call for tracking to ensure deterministic results
    await page.route('**/api/applications/track/*', async route => {
      const json = {
        status: 'in_progress',
        timeline: [
          { date: '2026-07-01', event: 'Application Submitted' },
          { date: '2026-07-05', event: 'Documents Verified' }
        ]
      };
      await route.fulfill({ json });
    });

    await page.fill('[data-testid="tracking-input"]', 'APP-12345');
    await page.click('[data-testid="track-submit"]');

    // Verify timeline renders
    await expect(page.locator('[data-testid="tracking-timeline"]')).toBeVisible();
    await expect(page.locator('text=Documents Verified')).toBeVisible();
  });

  test('Invalid Application ID', async ({ page }) => {
    await page.goto('/track');
    
    await page.route('**/api/applications/track/*', async route => {
      await route.fulfill({ status: 404, json: { error: 'Not found' } });
    });

    await page.fill('[data-testid="tracking-input"]', 'INVALID-ID');
    await page.click('[data-testid="track-submit"]');

    // Verify error message
    await expect(page.locator('[data-testid="tracking-error"]')).toBeVisible();
  });
});
