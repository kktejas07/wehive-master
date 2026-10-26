import { Page, expect } from '@playwright/test';

export class BasePage {
  constructor(protected page: Page) {}

  async waitForReady() {
    await this.page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await this.page.waitForTimeout(300);
  }

  async screenshot(name: string) {
    await this.page.screenshot({
      path: `artifacts/screens/${name}.png`,
      fullPage: true,
    }).catch(() => {});
  }

  async bodyHasContent() {
    return this.page.evaluate(() => document.body.children.length > 0).catch(() => false);
  }

  async ensureDir(subdir: string) {
    const fs = await import('fs');
    fs.mkdirSync(`artifacts/screens/${subdir}`, { recursive: true });
  }
}
