/**
 * Auth flows — sign up, sign in, agent login, protected routes, sign out.
 * Tests 13-17 from the E2E spec.
 */
import { test, expect } from '@playwright/test';
import fs from 'fs';
import { AuthPage } from './pages/AuthPage';

const SCREENS = 'artifacts/screens/auth';
test.beforeAll(() => fs.mkdirSync(SCREENS, { recursive: true }));

const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || '';
const TEST_EMAIL = `wehive-qa-${Date.now()}@mailinator.com`;

// ─── 13. Sign up — fill form, submit (OTP mocked via email) ───────────────
test.describe('Sign up flow', () => {
  test('signup form renders and accepts input', async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoSignup();

    // Switch to email/password mode
    await auth.switchToEmailMode();

    // Verify form fields are present
    const emailInput = page
      .getByTestId('email-input')
      .or(page.locator('input[type="email"]'))
      .first();
    const hasEmailField = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);
    expect.soft(hasEmailField, 'Email input not found on /signup').toBeTruthy();

    await auth.screenshot(`${SCREENS}/signup-form`);
  });

  test('empty submit shows validation, stays on /signup', async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoSignup();
    await auth.switchToEmailMode();

    const submit = page.getByTestId('signup-submit').or(
      page.getByRole('button', { name: /sign up|create|register/i }),
    ).first();
    if (await submit.isVisible({ timeout: 5000 }).catch(() => false)) {
      await submit.click();
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL(/\/signup/);
    }
    await auth.screenshot(`${SCREENS}/signup-empty-submit`);
  });

  test('invalid email is rejected', async ({ page }) => {
    test.skip(!TEST_PASSWORD, 'E2E_TEST_PASSWORD not set');
    const auth = new AuthPage(page);
    await auth.gotoSignup();
    await auth.fillSignupForm('QA Test', 'not-an-email', TEST_PASSWORD);
    await auth.submitSignup();
    await page.waitForTimeout(1200);
    await expect(page).toHaveURL(/\/signup/);
    await auth.screenshot(`${SCREENS}/signup-invalid-email`);
  });

  test('valid form submission initiates signup', async ({ page }) => {
    test.skip(!TEST_PASSWORD, 'E2E_TEST_PASSWORD not set');
    const auth = new AuthPage(page);
    await auth.gotoSignup();
    await auth.fillSignupForm('QA Test User', TEST_EMAIL, TEST_PASSWORD);
    await auth.screenshot(`${SCREENS}/signup-before-submit`);
    await auth.submitSignup();
    // Wait for Firebase + backend
    await page.waitForTimeout(4000);
    await auth.screenshot(`${SCREENS}/signup-after-submit`);
    // Should either navigate away OR show an OTP/verification step
    const url = page.url();
    const isStillOnSignup = url.includes('/signup');
    const hasOtpField = await page.locator('input[placeholder*="otp" i], input[placeholder*="code" i], input[name="otp"]').first().isVisible({ timeout: 2000 }).catch(() => false);
    // Either we moved past signup, or we're showing OTP prompt
    expect.soft(
      !isStillOnSignup || hasOtpField,
      'Signup submission had no visible effect',
    ).toBeTruthy();
  });
});

// ─── 14. Sign in — email + OTP / password flow ────────────────────────────
test.describe('Sign in flow', () => {
  test('login page renders email input', async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoLogin();

    const emailInput = page
      .getByTestId('email-input')
      .or(page.locator('input[type="email"]'))
      .first();
    // May need to switch to email mode first
    await auth.switchToEmailMode();
    const hasEmail = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);
    expect.soft(hasEmail, 'Email input not found on /login').toBeTruthy();
    await auth.screenshot(`${SCREENS}/login-form`);
  });

  test('wrong credentials shows error, stays on /login', async ({ page }) => {
    test.skip(!TEST_PASSWORD, 'E2E_TEST_PASSWORD not set — skipping credential test');
    const auth = new AuthPage(page);
    await auth.gotoLogin();
    await auth.fillLoginForm('nonexistent@wehive.co.in', 'WrongPassword123!');
    await auth.submitLogin();
    await page.waitForTimeout(2500);
    await expect(page).toHaveURL(/\/login/);
    await auth.screenshot(`${SCREENS}/login-wrong-creds`);
  });

  test('valid credentials authenticate user', async ({ page }) => {
    test.skip(!TEST_PASSWORD, 'E2E_TEST_PASSWORD not set');
    const auth = new AuthPage(page);
    await auth.gotoLogin();
    await auth.fillLoginForm(process.env.E2E_TEST_EMAIL || TEST_EMAIL, TEST_PASSWORD);
    await auth.submitLogin();
    await page.waitForTimeout(4000);
    const isAuthed = await auth.isLoggedIn();
    const url = page.url();
    // After login user should either be authed or redirected to OTP
    const hasOtp = await page.locator('input[placeholder*="otp" i], input[placeholder*="code" i]').first().isVisible({ timeout: 2000 }).catch(() => false);
    expect.soft(isAuthed || !url.includes('/login') || hasOtp, 'Login did not authenticate or navigate').toBeTruthy();
    await auth.screenshot(`${SCREENS}/login-after-submit`);
  });
});

// ─── 15. Agent sign-in page loads ─────────────────────────────────────────
test.describe('Agent portal login', () => {
  test('/agent-portal/login page renders', async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoAgentLogin();

    const hasContent = await auth.bodyHasContent();
    expect(hasContent).toBeTruthy();
    // Should have some form or login UI
    const hasForm = await page.locator('form, input[type="email"], [data-testid*="login"]').first().isVisible({ timeout: 8000 }).catch(() => false);
    expect.soft(hasForm, 'Agent login page has no form elements').toBeTruthy();
    await auth.screenshot(`${SCREENS}/agent-login`);
  });
});

// ─── 16. Protected route /account redirects to /login when unauthenticated ─
test.describe('Protected route guard', () => {
  test('/account redirects to /login with next param when not authenticated', async ({ page }) => {
    // No token injected — fresh page = unauthenticated
    await page.goto('/account');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1000);
    const url = page.url();
    expect(
      url.includes('/login'),
      `Expected redirect to /login but got: ${url}`,
    ).toBeTruthy();
    // Should include the ?next= param pointing back to /account
    expect.soft(url.includes('next'), `Expected ?next= param in URL but got: ${url}`).toBeTruthy();
    await page.screenshot({ path: `${SCREENS}/protected-route-redirect.png`, fullPage: true }).catch(() => {});
  });
});

// ─── 17. Sign out clears session ──────────────────────────────────────────
test.describe('Sign out', () => {
  test('sign out removes token from localStorage', async ({ page }) => {
    const token = process.env.E2E_AUTH_TOKEN || '';
    test.skip(!token, 'E2E_AUTH_TOKEN not set');

    // Inject token so we start authenticated
    await page.addInitScript((t) => {
      window.localStorage.setItem('wehive_token', t);
    }, token);

    await page.goto('/');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1000);

    const auth = new AuthPage(page);
    await auth.signOut();

    const tokenAfter = await page.evaluate(() => localStorage.getItem('wehive_token'));
    const isOnLoginPage = page.url().includes('/login');
    // After signout token should be gone OR page should redirect to login
    expect.soft(
      !tokenAfter || isOnLoginPage,
      'Token still present after sign out and not on /login',
    ).toBeTruthy();
    await auth.screenshot(`${SCREENS}/signout`);
  });
});
