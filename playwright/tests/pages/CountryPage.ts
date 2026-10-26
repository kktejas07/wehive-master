import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class CountryPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async gotoCountryDetail(countryCode: string) {
    await this.page.goto(`/visa/${countryCode}`);
    await this.waitForReady();
  }

  async gotoMapPage() {
    await this.page.goto('/map');
    await this.waitForReady();
  }

  async tabs() {
    return this.page.locator(
      '[role="tab"], [data-testid*="tab"], .tab-button, button[class*="tab"]',
    );
  }

  async clickTab(name: RegExp | string) {
    const tab = this.page
      .locator('[role="tab"], .tab-button')
      .filter({ hasText: name })
      .first();
    if (await tab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await tab.click();
      await this.page.waitForTimeout(600);
      return true;
    }
    return false;
  }

  async applyCtaButton() {
    return this.page
      .locator('a:has-text("Apply"), button:has-text("Apply"), [data-testid*="apply"]')
      .first();
  }

  async mapCountryCards() {
    return this.page.locator(
      '[data-testid="country-card"], .country-card, [class*="CountryCard"], .destination-card',
    );
  }

  async visaTabContent() {
    return this.page.locator('[role="tabpanel"], [data-testid="tab-content"], .tab-panel').first();
  }
}
