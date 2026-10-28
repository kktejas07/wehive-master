import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto('/');
    await this.waitForReady();
  }

  async heroText() {
    // Try multiple selectors — hero copy varies
    const hero = this.page
      .locator('h1, [data-testid="hero-heading"], .hero h1, .hero-section h1')
      .first();
    return hero;
  }

  async ctaButtons() {
    return this.page.locator(
      'a[href*="signup"], a[href*="register"], button:has-text("Get Started"), button:has-text("Apply"), [data-testid*="cta"]',
    );
  }

  async scrollToScoreboard() {
    const scoreboard = this.page.locator(
      '[data-testid="scoreboard"], .scoreboard, .counter-section, .stats-section, section:has(.counter)',
    ).first();
    if (await scoreboard.isVisible().catch(() => false)) {
      await scoreboard.scrollIntoViewIfNeeded();
    } else {
      await this.page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
    }
    await this.page.waitForTimeout(1500);
  }

  async typeCountrySearch(query: string) {
    const input = this.page
      .locator(
        'input[placeholder*="country" i], input[placeholder*="search" i], input[placeholder*="destination" i], [data-testid="country-search"]',
      )
      .first();
    await input.fill(query);
    await this.page.waitForTimeout(800);
    return input;
  }

  async countrySearchResults() {
    return this.page.locator(
      '[data-testid="country-result"], .country-result, .search-result, [role="option"]',
    );
  }

  async goToPage2InCountryGrid() {
    const page2Btn = this.page.locator(
      '[aria-label="Go to page 2"], button:has-text("2"), [data-testid="pagination-2"]',
    ).first();
    if (await page2Btn.isVisible().catch(() => false)) {
      await page2Btn.click();
      await this.page.waitForTimeout(800);
    }
  }

  async clickSolutionsMenu() {
    const menu = this.page.locator(
      '[data-testid="solutions-menu"], nav button:has-text("Solutions"), a:has-text("Solutions")',
    ).first();
    await menu.click().catch(() => {});
    await this.page.waitForTimeout(400);
  }

  async solutionsMenuItems() {
    return this.page.locator(
      '[data-testid="solutions-menu"] a, [role="menu"] a, .dropdown-menu a',
    );
  }

  async clickToolsMenu() {
    const menu = this.page.locator(
      '[data-testid="tools-menu"], nav button:has-text("Tools"), a:has-text("Tools"), nav a:has-text("AI Tools")',
    ).first();
    await menu.click().catch(() => {});
    await this.page.waitForTimeout(400);
  }
}
