import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { STATIC_ROUTES, DYNAMIC_ROUTES_RESOLVED, RouteDef } from './routes';

const ROUTES_TO_TEST: RouteDef[] = [...STATIC_ROUTES, ...DYNAMIC_ROUTES_RESOLVED];

const ARTIFACTS_DIR = path.join(__dirname, '..', 'artifacts');
const SCREENS_DIR = path.join(ARTIFACTS_DIR, 'screens', 'ws1');
const INVENTORY_PATH = path.join(ARTIFACTS_DIR, 'route-inventory.json');

fs.mkdirSync(SCREENS_DIR, { recursive: true });

type RouteResult = {
  path: string;
  reachedFrom: string;
  requiresAuth: any;
  note?: string;
  browser: string;
  httpStatus: number | null;
  renderedOk: boolean;
  bodyHasChildren: boolean;
  title: string;
  consoleErrors: string[];
  failedRequests: { url: string; status: number }[];
  screenshot: string;
  discoveredLinks: string[];
};

// Shared results array written once at the end of the whole file's run
const results: RouteResult[] = [];

async function auditRoute(page: Page, browserName: string, route: RouteDef): Promise<RouteResult> {
  const consoleErrors: string[] = [];
  const failedRequests: { url: string; status: number }[] = [];
  let httpStatus: number | null = null;

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));
  page.on('response', (res) => {
    const status = res.status();
    if (status >= 400) {
      failedRequests.push({ url: res.url(), status });
    }
  });

  let renderedOk = true;
  try {
    const resp = await page.goto(route.path, { waitUntil: 'domcontentloaded' });
    httpStatus = resp ? resp.status() : null;
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {
      // SPA may keep a long-poll/websocket open; don't fail the route for that alone
    });
    await page.waitForTimeout(500);
  } catch (e: any) {
    renderedOk = false;
    consoleErrors.push(`navigation error: ${e.message}`);
  }

  const bodyHasChildren = await page.evaluate(() => document.body.children.length > 0).catch(() => false);
  const title = await page.title().catch(() => '');

  const discoveredLinks = await page
    .evaluate(() =>
      Array.from(document.querySelectorAll('a[href]'))
        .map((a) => (a as HTMLAnchorElement).getAttribute('href') || '')
        .filter((h) => h.startsWith('/') && !h.startsWith('//'))
    )
    .catch(() => [] as string[]);

  const safeName = route.path.replace(/[\/:]/g, '_') || '_root';
  const screenshotPath = path.join(SCREENS_DIR, `${browserName}${safeName}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});

  if (!bodyHasChildren) renderedOk = false;

  return {
    path: route.path,
    reachedFrom: 'App.js route table',
    requiresAuth: route.requiresAuth,
    note: route.note,
    browser: browserName,
    httpStatus,
    renderedOk,
    bodyHasChildren,
    title,
    consoleErrors: [...new Set(consoleErrors)],
    failedRequests,
    screenshot: path.relative(ARTIFACTS_DIR, screenshotPath),
    discoveredLinks: [...new Set(discoveredLinks)],
  };
}

test.describe('WS1 route discovery', () => {
  for (const route of ROUTES_TO_TEST) {
    test(`route ${route.path}`, async ({ page }, testInfo) => {
      const result = await auditRoute(page, testInfo.project.name, route);
      results.push(result);

      // Soft assertions: record findings without aborting the whole sweep
      expect
        .soft(result.bodyHasChildren, `${route.path} rendered a blank body (white-screen)`)
        .toBeTruthy();
      expect
        .soft(result.consoleErrors.length, `${route.path} had console/page errors: ${result.consoleErrors.join(' | ')}`)
        .toBe(0);
      expect
        .soft(result.failedRequests.length, `${route.path} had failed requests: ${JSON.stringify(result.failedRequests)}`)
        .toBe(0);
    });
  }

  test.afterAll(async () => {
    let existing: RouteResult[] = [];
    if (fs.existsSync(INVENTORY_PATH)) {
      try {
        existing = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf-8'));
      } catch {
        existing = [];
      }
    }
    const merged = [...existing, ...results];
    fs.writeFileSync(INVENTORY_PATH, JSON.stringify(merged, null, 2));
  });
});
