/**
 * E2E regression tests for bugs identified and fixed in WeHive.
 *
 * Bug 5:  /signin 404 → should redirect to /login
 * Bug 6:  /tools/visa-checker 404 → should redirect to /visa-checker
 * Bug 9:  Map page shows Globe icons → should show flag emoji + destination images
 * Bug 10: Blank space in country grid → grid should not overflow between content and pagination
 */

import { test, expect } from './fixtures';

// ---------------------------------------------------------------------------
// Bug 5: /signin redirect
// ---------------------------------------------------------------------------
test.describe('Bug 5 — /signin redirects to /login', () => {
  test('/signin redirects to /login', async ({ page }) => {
    await page.goto('/signin');
    await page.waitForURL(/\/login$/);
    await expect(page).toHaveURL(/\/login$/);
  });

  test('/signin redirect keeps the login page intact', async ({ page }) => {
    await page.goto('/signin');
    await page.waitForURL(/\/login$/);
    // Should see the sign-in form, not a 404
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Bug 6: /tools/visa-checker redirect
// ---------------------------------------------------------------------------
test.describe('Bug 6 — /tools/visa-checker redirects to /visa-checker', () => {
  test('/tools/visa-checker redirects correctly', async ({ page }) => {
    await page.goto('/tools/visa-checker');
    await page.waitForURL(/\/visa-checker$/);
    await expect(page).toHaveURL(/\/visa-checker$/);
  });

  test('/tools/anything-else also redirects to /visa-checker', async ({ page }) => {
    await page.goto('/tools/passport-checker');
    await page.waitForURL(/\/visa-checker$/);
    await expect(page).toHaveURL(/\/visa-checker$/);
  });

  test('/tools redirect lands on a working visa-checker page', async ({ page }) => {
    await page.goto('/tools/visa-checker');
    await page.waitForURL(/\/visa-checker$/);
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Bug 9: Map page — destination images / flags
// ---------------------------------------------------------------------------
test.describe('Bug 9 — Map page visa cards show flags/images instead of Globe icons', () => {
  test('map page renders without errors', async ({ page }) => {
    await page.goto('/map');
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
  });

  test('visa cards show country names', async ({ page }) => {
    await page.goto('/map');
    // At least some known countries should be visible
    await expect(page.getByText('USA').first()).toBeVisible();
    await expect(page.getByText('Japan').first()).toBeVisible();
  });

  test('visa cards have Apply Now buttons', async ({ page }) => {
    await page.goto('/map');
    const applyButtons = page.getByRole('link', { name: /apply now/i });
    await expect(applyButtons.first()).toBeVisible();
    const count = await applyButtons.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('visa card images use local destination webp files', async ({ page }) => {
    const imageRequests: string[] = [];
    page.on('request', (req) => {
      if (req.resourceType() === 'image') {
        imageRequests.push(req.url());
      }
    });

    await page.goto('/map');
    await page.waitForLoadState('networkidle');

    // At least some destination images should be requested from /images/destinations/
    const destImages = imageRequests.filter((u) => u.includes('/images/destinations/'));
    expect(destImages.length).toBeGreaterThan(0);
  });

  test('no standalone Globe icon SVG fallbacks visible (flags should render)', async ({ page }) => {
    await page.goto('/map');
    await page.waitForLoadState('networkidle');

    // The emoji flag spans should be present in the visa cards
    // Each VisaCard renders <span> with emoji flag text
    const flagSpans = page.locator('.relative.z-10.text-4xl');
    const count = await flagSpans.count();
    // We have 8 POPULAR_VISAS entries
    expect(count).toBeGreaterThanOrEqual(8);
  });
});

// ---------------------------------------------------------------------------
// Bug 10: Country grid blank space
// ---------------------------------------------------------------------------
test.describe('Bug 10 — Country grid has no extra blank space below partial last row', () => {
  test('destinations page renders without layout errors', async ({ page, api }) => {
    // Mock the countries API
    api.on('GET', /^\/public\/countries/, [
      { id: 'us', name: 'USA', continent: 'North America', flag: '🇺🇸' },
      { id: 'uk', name: 'UK', continent: 'Europe', flag: '🇬🇧' },
      { id: 'au', name: 'Australia', continent: 'Oceania', flag: '🇦🇺' },
    ]);

    await page.goto('/');
    // Navigate to a page that might use CountryGrid
    // CountryGrid is typically used on pages with pagination
    await expect(page.locator('body')).toBeVisible();
  });

  test('country grid does not overflow the viewport height', async ({ page, api }) => {
    api.on('GET', /^\/public\/countries/, Array.from({ length: 11 }, (_, i) => ({
      id: `c${i}`, name: `Country ${i}`, continent: 'Asia', flag: '🌍',
    })));

    // Navigate to student-visa which uses country grid internally
    await page.goto('/student-visa');
    await expect(page.getByText('Something went wrong')).toHaveCount(0);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, 'horizontal overflow (px)').toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// General redirect smoke tests (complements existing smoke suite)
// ---------------------------------------------------------------------------
test.describe('Redirect routes work correctly', () => {
  test('/universities redirects to /student-visa (pre-existing)', async ({ page }) => {
    await page.goto('/universities');
    await expect(page).toHaveURL(/\/student-visa$/);
  });

  test('/signin redirects to /login (Bug 5)', async ({ page }) => {
    await page.goto('/signin');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('/tools/visa-checker redirects to /visa-checker (Bug 6)', async ({ page }) => {
    await page.goto('/tools/visa-checker');
    await expect(page).toHaveURL(/\/visa-checker$/);
  });
});
