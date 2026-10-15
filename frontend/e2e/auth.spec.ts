import { test, expect, signIn, TEST_USER } from './fixtures';

test('protected /account redirects anonymous users to login with next param', async ({ page }) => {
  await page.goto('/account');
  await expect(page).toHaveURL(/\/login\?next=%2Faccount$/);
});

test('email sign-in with empty fields asks for credentials', async ({ page, api }) => {
  api.on('GET', /^\/public\/auth-config$/, { google_enabled: false, email_password_enabled: true, otp_enabled: true });
  await page.goto('/login');
  await page.getByRole('button', { name: 'Email', exact: true }).click();
  await page.getByTestId('login-submit').click();
  await expect(page.getByText('Enter email and password').first()).toBeVisible();
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

test('email sign-in whose backend sync fails shows the error and stays on login', async ({ page, api }) => {
  // Fake Firebase project + identitytoolkit/securetoken responses so signInWithEmailAndPassword succeeds locally.
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const idToken = `${b64({ alg: 'none' })}.${b64({ sub: 'fb-e2e-1', email: TEST_USER.email, email_verified: true, iat: now, exp: now + 3600, auth_time: now })}.sig`;
  const fbUser = { localId: 'fb-e2e-1', email: TEST_USER.email, emailVerified: true, displayName: TEST_USER.name };
  await page.route(/identitytoolkit\.googleapis\.com\/v1\/accounts:signInWithPassword/, (r) =>
    r.fulfill({ json: { kind: 'identitytoolkit#VerifyPasswordResponse', ...fbUser, idToken, refreshToken: 'r', expiresIn: '3600', registered: true } }));
  await page.route(/identitytoolkit\.googleapis\.com\/v1\/accounts:lookup/, (r) =>
    r.fulfill({ json: { kind: 'identitytoolkit#GetAccountInfoResponse', users: [fbUser] } }));
  await page.route(/securetoken\.googleapis\.com\/v1\/token/, (r) =>
    r.fulfill({ json: { access_token: idToken, id_token: idToken, refresh_token: 'r', expires_in: '3600', token_type: 'Bearer', user_id: 'fb-e2e-1' } }));
  api
    .on('GET', /^\/public\/auth-config$/, { google_enabled: false, email_password_enabled: true, otp_enabled: false })
    .on('GET', /^\/public\/firebase-config$/, { configured: true, config: { apiKey: 'e2e-fake-key', authDomain: 'e2e.firebaseapp.com', projectId: 'e2e', appId: '1:1:web:1' } })
    .on('POST', /^\/auth\/firebase-sync$/, { detail: 'Account is disabled' }, 403);

  await page.goto('/login');
  await page.getByTestId('email-input').fill(TEST_USER.email);
  await page.getByTestId('password-input').fill('correct-horse');
  await page.getByTestId('login-submit').click();

  await expect(page.getByText('Account is disabled').first()).toBeVisible();
  await expect(page.getByText('Signed in with email.')).toHaveCount(0);
  await expect(page).toHaveURL(/\/login/);
  expect(api.calls.some((c) => c.path === '/auth/firebase-sync')).toBe(true);
});
