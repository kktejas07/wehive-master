import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class AuthPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async gotoLogin() {
    await this.page.goto('/login');
    await this.waitForReady();
  }

  async gotoSignup() {
    await this.page.goto('/signup');
    await this.waitForReady();
  }

  async gotoAgentLogin() {
    await this.page.goto('/agent-portal/login');
    await this.waitForReady();
  }

  /** Switch signup form to email/password mode (WeHive shows a button to toggle method) */
  async switchToEmailMode() {
    const emailModeBtn = this.page
      .getByRole('button', { name: /email/i })
      .first();
    if (await emailModeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailModeBtn.click();
      await this.page.waitForTimeout(400);
    }
  }

  async fillSignupForm(name: string, email: string, password: string) {
    await this.switchToEmailMode();
    const nameInput = this.page
      .locator('input[placeholder*="name" i], input[name="name"], [data-testid="name-input"]')
      .first();
    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameInput.fill(name);
    }
    await this.page.getByTestId('email-input').fill(email);
    await this.page.getByTestId('password-input').fill(password);
  }

  async submitSignup() {
    await this.page.getByTestId('signup-submit').click();
  }

  async fillLoginForm(email: string, password: string) {
    await this.switchToEmailMode();
    const emailInput = this.page
      .getByTestId('email-input')
      .or(this.page.locator('input[type="email"]'))
      .first();
    await emailInput.fill(email);
    const passwordInput = this.page
      .getByTestId('password-input')
      .or(this.page.locator('input[type="password"]'))
      .first();
    await passwordInput.fill(password);
  }

  async submitLogin() {
    const btn = this.page
      .getByTestId('login-submit')
      .or(this.page.getByRole('button', { name: /sign in|log in|continue/i }))
      .first();
    await btn.click();
  }

  async signOut() {
    // Try user-menu trigger → sign out
    const trigger = this.page.getByTestId('usermenu-trigger');
    if (await trigger.isVisible({ timeout: 3000 }).catch(() => false)) {
      await trigger.click();
      await this.page.waitForTimeout(400);
    }
    const signOutBtn = this.page
      .getByRole('menuitem', { name: /sign out|log out/i })
      .or(this.page.getByRole('button', { name: /sign out|log out/i }))
      .first();
    if (await signOutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await signOutBtn.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async isLoggedIn() {
    const token = await this.page.evaluate(() => localStorage.getItem('wehive_token'));
    const userMenu = await this.page.getByTestId('usermenu-trigger').isVisible().catch(() => false);
    return !!token || userMenu;
  }

  /** Inject a token so the app treats the page as authenticated without a real login round-trip */
  async injectToken(token: string) {
    await this.page.addInitScript((t) => {
      window.localStorage.setItem('wehive_token', t);
    }, token);
  }
}
