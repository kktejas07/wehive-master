import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class AdminPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async login(email: string, password: string) {
    await this.page.goto('/login');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(500);

    // Switch to email mode if the toggle exists
    const emailModeBtn = this.page.getByRole('button', { name: /email/i }).first();
    if (await emailModeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailModeBtn.click();
      await this.page.waitForTimeout(400);
    }

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

    const submitBtn = this.page
      .getByTestId('login-submit')
      .or(this.page.getByRole('button', { name: /sign in|log in|continue/i }))
      .first();
    await submitBtn.click();

    // Wait for navigation away from login
    await this.page.waitForTimeout(3000);
  }

  async gotoAdmin() {
    await this.page.goto('/admin');
    await this.waitForReady();
  }

  async gotoSection(section: string) {
    await this.page.goto(`/admin/${section}`);
    await this.waitForReady();
  }

  async dashboardKpiCards() {
    return this.page.locator(
      '[data-testid*="kpi"], [data-testid*="stat-card"], .stat-card, [class*="KpiCard"], [class*="StatCard"]',
    );
  }

  async table() {
    return this.page.locator('table, [role="table"], [data-testid*="table"]').first();
  }

  async searchInput() {
    return this.page
      .locator('input[placeholder*="search" i], [data-testid="search-input"], input[type="search"]')
      .first();
  }

  async tableRows() {
    return this.page.locator('tbody tr, [role="row"]:not([role="row"]:first-child)');
  }

  async filterDropdown() {
    return this.page
      .locator('select, [data-testid*="filter"], button:has-text("Filter"), [role="combobox"]')
      .first();
  }

  /** Check if the page has meaningful content (table, cards, or list items) */
  async hasContent() {
    const table = await this.page.locator('table, [role="table"]').first().isVisible().catch(() => false);
    const cards = await this.page.locator('.card, [class*="Card"]').first().isVisible().catch(() => false);
    const listItems = await this.page.locator('li, [role="listitem"]').first().isVisible().catch(() => false);
    return table || cards || listItems;
  }

  async isOnAdminPage() {
    return this.page.url().includes('/admin');
  }
}
