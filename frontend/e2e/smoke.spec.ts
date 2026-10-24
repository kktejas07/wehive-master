import { test, expect } from './fixtures';

// Every public, param-less route in src/App.js. Each must render without crashing the
// ErrorBoundary, throwing uncaught errors, or overflowing horizontally on a phone.
const ROUTES = [
  '/', '/about', '/pricing', '/login', '/signup', '/track', '/assessment', '/help', '/contact',
  '/student-visa', '/visa-interview', '/visa-interview-sandbox', '/map', '/resources',
  '/intake-calendar', '/financial-tools', '/agent-training', '/emergency', '/visa-scheduling',
  '/visa-checker', '/visa-enquiry', '/free-consultation', '/events', '/blog', '/news', '/hive', '/us-visa-slots', '/agent/login',
];

for (const path of ROUTES) {
  test(`renders ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page.getByText('Something went wrong')).toHaveCount(0);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, 'horizontal overflow (px)').toBeLessThanOrEqual(1);
  });
}

test('unknown route shows the 404 page', async ({ page }) => {
  await page.goto('/definitely-not-a-page');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});

test('/universities redirects to /student-visa', async ({ page }) => {
  await page.goto('/universities');
  await expect(page).toHaveURL(/\/student-visa$/);
});
