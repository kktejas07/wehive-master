import { test, expect, isCollapsedNav } from './fixtures';

test('home hero renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('hero-heading')).toBeVisible();
});

test('main navigation reaches Pricing and Contact', async ({ page }) => {
  for (const [label, path] of [['Pricing', '/pricing'], ['Contact', '/contact']]) {
    await page.goto('/');
    if (isCollapsedNav(page)) {
      await page.getByRole('button', { name: 'Toggle menu' }).click();
      await page.getByRole('navigation', { name: 'Mobile' }).getByRole('link', { name: label, exact: true }).click();
    } else {
      await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: label, exact: true }).click();
    }
    await expect(page).toHaveURL(new RegExp(`${path}$`));
  }
});

test('track portal navigates to status page and shows the application', async ({ page, api }) => {
  api.on('GET', /^\/public\/track\/us-student-101$/, {
    id: 'us-student-101', country_id: 'us', country_name: 'United States', visa_type: 'F-1 Student',
    status: 'submitted', timeline: [{ status: 'submitted', at: '2026-10-01T10:00:00Z' }],
  });
  await page.goto('/track');
  await page.getByPlaceholder(/Application ID/).fill('us-student-101');
  await page.getByPlaceholder(/Application ID/).press('Enter');

  await expect(page).toHaveURL(/\/track\/us-student-101$/);
  await expect(page.getByRole('heading', { name: /United States · F-1 Student/ })).toBeVisible();
});

test('tracking an unknown application shows the backend error', async ({ page, api }) => {
  api.on('GET', /^\/public\/track\//, { detail: 'Application not found' }, 404);
  await page.goto('/track/nope-404');
  await expect(page.getByRole('heading', { name: 'Application not found' })).toBeVisible();
});

test.describe('contact form', () => {
  test('rejects an empty submission without calling the API', async ({ page, api }) => {
    await page.goto('/contact');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByText('Please fill in all required fields').first()).toBeVisible();
    expect(api.calls.filter((c) => c.path === '/leads')).toHaveLength(0);
  });

  test('submits a lead', async ({ page, api }) => {
    api.on('POST', /^\/leads$/, { ok: true });
    await page.goto('/contact');
    await page.getByRole('main').getByLabel('Your name').fill('Priya Sharma');
    await page.getByRole('main').getByLabel('Email address').fill('priya@example.com');
    await page.getByRole('button', { name: 'What is this about' }).click();
    await page.getByRole('option', { name: 'Visa consultation' }).or(page.getByRole('button', { name: 'Visa consultation' })).click();
    await page.getByRole('main').getByLabel('Your message').fill('Need help with an F-1 visa.');
    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByText('Message sent!').first()).toBeVisible();
    const lead = api.calls.find((c) => c.path === '/leads')?.body as { email: string; message: string };
    expect(lead.email).toBe('priya@example.com');
    expect(lead.message).toContain('Visa consultation');
  });

  test('surfaces a server failure', async ({ page, api }) => {
    api.on('POST', /^\/leads$/, { detail: 'boom' }, 500);
    await page.goto('/contact');
    await page.getByRole('main').getByLabel('Your name').fill('Priya Sharma');
    await page.getByRole('main').getByLabel('Email address').fill('priya@example.com');
    await page.getByRole('button', { name: 'What is this about' }).click();
    await page.getByRole('option', { name: 'General inquiry' }).or(page.getByRole('button', { name: 'General inquiry' })).click();
    await page.getByRole('main').getByLabel('Your message').fill('Hello');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByText('Failed to send').first()).toBeVisible();
  });
});

test('visa checker uses the backend Sherpa proxy, never joinsherpa.io directly', async ({ page, api }) => {
  const sherpaHits: string[] = [];
  await page.route(/joinsherpa\.io/, (r) => { sherpaHits.push(r.request().url()); return r.abort(); });
  api.on('POST', /^\/visa-providers\/sherpa\/trips$/, { included: [] });

  await page.goto('/visa-checker');
  await page.getByRole('button', { name: /^Destination: / }).first().click();
  await page.getByRole('button', { name: 'Check Visa Requirements' }).click();

  await expect(page.getByText('Visa Not Required').first()).toBeVisible();
  expect(api.calls.find((c) => c.path === '/visa-providers/sherpa/trips')?.body).toMatchObject({ citizenship: 'IN' });
  expect(sherpaHits).toEqual([]);
});

test('unknown admin sub-path redirects to the admin overview', async ({ page, api }) => {
  api.on('GET', /^\/admin-auth\/me$/, { id: 'a-e2e-1', email: 'admin@example.com', name: 'E2E Admin', role: 'super_admin' });
  await page.addInitScript(() => window.localStorage.setItem('wehive_admin_token', 'e2e-admin-token'));
  await page.goto('/admin/does-not-exist');
  await expect(page).toHaveURL(/\/admin$/);
});
