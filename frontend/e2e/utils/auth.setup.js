import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const authFile = path.join(__dirname, '../../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  // We'll mock the authentication instead of actually logging in.
  // Real login would require setting up user records and bypassing CAPTCHAs.
  
  // Set localStorage tokens that the app looks for
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('wehive_token', 'mock_token_for_playwright');
    localStorage.setItem('wehive_user', JSON.stringify({
      id: 'test_user_id',
      email: 'test@wehive.app',
      name: 'Playwright Tester'
    }));
  });

  await page.context().storageState({ path: authFile });
});
