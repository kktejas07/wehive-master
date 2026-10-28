import { test, expect, signIn, TEST_USER } from './fixtures';

test('protected /account redirects anonymous users to login with next param', async ({ page }) => {
  await page.goto('/account');
  await expect(page).toHaveURL(/\/login\?next=%2Faccount$/);
});

test('OTP sign-in lands on the account dashboard', async ({ page, api }) => {
  api
    .on('GET', /^\/public\/auth-config$/, { google_enabled: false, email_password_enabled: false, otp_enabled: true })
    .on('POST', /^\/auth\/send-otp$/, { channel: 'email', masked: 'e2***@example.com' })
    .on('POST', /^\/auth\/verify-otp$/, { access_token: 'e2e-token', user: TEST_USER });
  await signIn(page, api); // mocks /auth/me etc.; token seeded below is overwritten by verify
  await page.addInitScript(() => window.localStorage.removeItem('wehive_token'));

  await page.goto('/login?next=/account');
  await page.locator('#authcard-identifier').fill(TEST_USER.email);
  await page.getByRole('button', { name: 'Send code' }).click();

  for (let i = 1; i <= 6; i++) await page.getByLabel(`Digit ${i}`).fill(String(i));
  await page.getByRole('button', { name: /Verify & continue/ }).click();

  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByTestId('account-dashboard')).toBeVisible();
  expect(api.calls.find((c) => c.path === '/auth/verify-otp')?.body).toMatchObject({ identifier: TEST_USER.email, code: '123456' });
});

test('invalid OTP shows an error and stays on login', async ({ page, api }) => {
  api
    .on('GET', /^\/public\/auth-config$/, { google_enabled: false, email_password_enabled: false, otp_enabled: true })
    .on('POST', /^\/auth\/send-otp$/, { channel: 'email', masked: 'e2***@example.com' })
    .on('POST', /^\/auth\/verify-otp$/, { detail: 'Invalid or expired code' }, 400);
  await page.goto('/login');
  await page.locator('#authcard-identifier').fill(TEST_USER.email);
  await page.getByRole('button', { name: 'Send code' }).click();
  for (let i = 1; i <= 6; i++) await page.getByLabel(`Digit ${i}`).fill('0');
  await page.getByRole('button', { name: /Verify & continue/ }).click();

  await expect(page.getByText('Verification failed').first()).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('signed-in user sees the account dashboard', async ({ page, api }) => {
  await signIn(page, api);
  await page.goto('/account');
  await expect(page.getByTestId('account-dashboard')).toBeVisible();
});

test('expired session (401 on /auth/me) is sent back to login', async ({ page, api }) => {
  await signIn(page, api);
  api.on('GET', /^\/auth\/me$/, { detail: 'expired' }, 401);
  await page.goto('/account');
  await expect(page).toHaveURL(/\/login\?next=/);
});
