import { test, expect } from '@playwright/test';

// Use the authenticated state for these tests if Visa Assessment requires login
// (Assuming it requires auth for full functionality, or we can test public paths)

test.describe('Visa Assessment Flow', () => {
  test('Complete Assessment Successfully', async ({ page }) => {
    await page.goto('/visa-assessment'); // Adjust route if needed
    
    // Check if the form renders
    await expect(page.locator('[data-testid="assessment-form"]')).toBeVisible();

    // Step 1: Destination
    await page.fill('[data-testid="destination-input"]', 'Canada');
    await page.click('[data-testid="next-step"]');

    // Step 2: Personal Info
    await page.fill('[data-testid="nationality-input"]', 'India');
    await page.click('[data-testid="next-step"]');

    // Submit
    await page.click('[data-testid="submit-assessment"]');

    // Verify success
    await expect(page.locator('[data-testid="assessment-success"]')).toBeVisible();
  });

  test('Assessment Validation Errors', async ({ page }) => {
    await page.goto('/visa-assessment');
    
    // Try skipping required fields
    await page.click('[data-testid="next-step"]');
    
    // Verify error
    await expect(page.locator('[data-testid="destination-error"]')).toBeVisible();
  });
});
