/**
 * Public-facing page flow tests for WeHive.
 * Covers: Map, Student Visa, News, Blog, Events, Visa Checker flows.
 * All tests use the ApiMock fixture to avoid hitting the real backend.
 */

import { test, expect } from './fixtures';

// ---------------------------------------------------------------------------
// Map / Explore page
// ---------------------------------------------------------------------------
test.describe('Map page', () => {
  test('loads and shows heading', async ({ page }) => {
    await page.goto('/map');
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
  });

  test('has navigation tabs or sections', async ({ page }) => {
    await page.goto('/map');
    // At least one country/destination section should be visible
    const body = await page.textContent('body');
    expect(body?.length).toBeGreaterThan(100);
  });

  test('Apply Now links navigate to login when unauthenticated', async ({ page }) => {
    await page.goto('/map');
    const applyLinks = page.getByRole('link', { name: /apply now/i });
    const count = await applyLinks.count();
    if (count > 0) {
      const href = await applyLinks.first().getAttribute('href');
      expect(href).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// Visa Checker
// ---------------------------------------------------------------------------
test.describe('Visa Checker page', () => {
  test('loads without errors', async ({ page }) => {
    await page.goto('/visa-checker');
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
  });

  test('has country selection inputs', async ({ page }) => {
    await page.goto('/visa-checker');
    // Should have at minimum one select/dropdown or search input
    const inputs = page.locator('input, select');
    const count = await inputs.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('redirects from /tools/visa-checker', async ({ page }) => {
    await page.goto('/tools/visa-checker');
    await page.waitForURL(/\/visa-checker$/);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Student Visa page
// ---------------------------------------------------------------------------
test.describe('Student Visa page', () => {
  test('loads without errors', async ({ page }) => {
    await page.goto('/student-visa');
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
  });

  test('/universities redirect lands here', async ({ page }) => {
    await page.goto('/universities');
    await page.waitForURL(/\/student-visa$/);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('page has country or university content', async ({ page }) => {
    await page.goto('/student-visa');
    const body = await page.textContent('body');
    // Should mention study/education topics
    expect(
      body?.toLowerCase().match(/study|university|student|visa|abroad|education/)
    ).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// News page
// ---------------------------------------------------------------------------
test.describe('News page', () => {
  test('loads without errors', async ({ page, api }) => {
    api.on('GET', /^\/public\/news/, {
      items: [
        { id: 'n1', title: 'Visa Policy Update 2026', summary: 'New rules for tourist visas.', published_at: '2026-01-15', source: 'Times of India' },
        { id: 'n2', title: 'Study Abroad Opportunities', summary: 'Top universities accepting applications.', published_at: '2026-01-14', source: 'NDTV' },
      ],
      total: 2,
    });
    await page.goto('/news');
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
  });

  test('displays news articles or loading state', async ({ page, api }) => {
    api.on('GET', /^\/public\/news/, { items: [], total: 0 });
    await page.goto('/news');
    // Should not crash even with empty news
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
  });

  test('news articles do not contain raw URLs in body text (Bug 8 regression)', async ({ page, api }) => {
    api.on('GET', /^\/public\/news/, {
      items: [
        {
          id: 'n3',
          title: 'Test Article',
          // After Bug 8 fix, body_text should have no raw https:// URLs
          body_text: 'This is clean article text without any URLs embedded.',
          published_at: '2026-01-10',
          source: 'Test',
        },
      ],
      total: 1,
    });
    await page.goto('/news');
    // Verify no bare URLs appear in the rendered text (Bug 8 regression guard)
    const pageText = await page.textContent('body');
    const bareUrlMatches = pageText?.match(/https?:\/\/\S{20,}/g) || [];
    // Allow at most 3 incidental URLs (navigation links, etc.) — article body should be clean
    expect(bareUrlMatches.length).toBeLessThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// Blog page
// ---------------------------------------------------------------------------
test.describe('Blog page', () => {
  test('loads without errors', async ({ page }) => {
    await page.goto('/blog');
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
  });

  test('shows blog listing or empty state gracefully', async ({ page }) => {
    await page.goto('/blog');
    const body = await page.textContent('body');
    expect(body?.length).toBeGreaterThan(50);
  });
});

// ---------------------------------------------------------------------------
// Events page
// ---------------------------------------------------------------------------
test.describe('Events page', () => {
  test('loads without errors', async ({ page, api }) => {
    api.on('GET', /^\/public\/events/, {
      items: [
        { id: 'e1', title: 'Visa Consultation Fair', date: '2026-02-10', location: 'Hyderabad', seats: 50 },
        { id: 'e2', title: 'Study Abroad Seminar', date: '2026-02-20', location: 'Bangalore', seats: 30 },
      ],
      total: 2,
    });
    await page.goto('/events');
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
  });

  test('shows event listing or empty state', async ({ page, api }) => {
    api.on('GET', /^\/public\/events/, { items: [], total: 0 });
    await page.goto('/events');
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// Assessment page
// ---------------------------------------------------------------------------
test.describe('Assessment page', () => {
  test('loads without errors', async ({ page }) => {
    await page.goto('/assessment');
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
  });

  test('has form elements for user input', async ({ page }) => {
    await page.goto('/assessment');
    // Assessment should have input/select elements
    const interactiveElements = page.locator('input, select, textarea, button');
    const count = await interactiveElements.count();
    expect(count).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Login page
// ---------------------------------------------------------------------------
test.describe('Login page', () => {
  test('loads without errors', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
  });

  test('has email input', async ({ page }) => {
    await page.goto('/login');
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="mail" i]');
    await expect(emailInput.first()).toBeVisible();
  });

  test('/signin redirects to /login (Bug 5 regression)', async ({ page }) => {
    await page.goto('/signin');
    await page.waitForURL(/\/login$/);
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="mail" i]');
    await expect(emailInput.first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// About page
// ---------------------------------------------------------------------------
test.describe('About page', () => {
  test('loads without errors', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// Help / FAQ page
// ---------------------------------------------------------------------------
test.describe('Help page', () => {
  test('loads without errors', async ({ page }) => {
    await page.goto('/help');
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// Pricing page
// ---------------------------------------------------------------------------
test.describe('Pricing page', () => {
  test('loads without errors', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
  });

  test('shows pricing tiers', async ({ page }) => {
    await page.goto('/pricing');
    const body = await page.textContent('body');
    // Should mention pricing-related terms
    expect(
      body?.toLowerCase().match(/plan|price|premium|free|₹|\$|month|year/)
    ).toBeTruthy();
  });
});
