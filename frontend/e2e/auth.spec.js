import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test('Successful Login', async ({ page }) => {
    await page.goto('/login');
    
    // Fill login form
    await page.fill('[data-testid="email-input"]', 'test@wehive.app');
    await page.fill('[data-testid="password-input"]', 'password123');
    
    // Submit form
    await page.click('[data-testid="login-submit"]');
    
    // Verify successful redirect or success message
    await expect(page.locator('[data-testid="account-dashboard"]')).toBeVisible();
  });

  test('Login Failure - Invalid Credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[data-testid="email-input"]', 'wrong@wehive.app');
    await page.fill('[data-testid="password-input"]', 'wrongpass');
    await page.click('[data-testid="login-submit"]');
    
    // Verify error message
    await expect(page.locator('[data-testid="login-error-message"]')).toBeVisible();
  });

  test('Signup Validation Errors', async ({ page }) => {
    await page.goto('/signup');
    
    // Submit empty form
    await page.click('[data-testid="signup-submit"]');
    
    // Verify required field errors
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
  });
});
