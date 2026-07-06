import { test as base } from '@playwright/test';

/**
 * Extended test fixture that blocks third-party platform scripts which are
 * only needed in the Emergent hosting environment and can interfere with
 * local E2E runs (e.g. database connection overlays).
 */
export const test = base.extend<{ blockPlatformScripts: void }>({
  blockPlatformScripts: [
    async ({ page }, use) => {
      await page.route('**/*emergent*', (route) => route.abort('blockedbyclient'));
      await use();
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
