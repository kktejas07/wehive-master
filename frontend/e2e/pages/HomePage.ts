import { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly heroHeading: Locator;
  readonly nav: Locator;
  readonly statsStrip: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heroHeading = page.getByTestId('hero-heading');
    this.nav = page.locator('nav').first();
    this.statsStrip = page.getByTestId('hero-stats-strip');
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async navigateTo(label: string) {
    await this.nav.getByRole('link', { name: label, exact: true }).click();
    await this.page.waitForLoadState('networkidle');
  }
}
