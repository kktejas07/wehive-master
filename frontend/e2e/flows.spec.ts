import { test, expect, isCollapsedNav, signIn } from './fixtures';

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

test('visa enquiry hands passport and destination to the public visa checker', async ({ page }) => {
  await page.goto('/visa-enquiry');
  await page.getByLabel('Travelling to').selectOption('uk');
  await page.getByLabel('Passport country').selectOption('us');
  await page.getByRole('button', { name: 'Check requirements' }).click();

  await expect(page).toHaveURL(/\/visa-checker\?from=US&to=GB$/);
  await expect(page.getByRole('button', { name: /^Nationality: United States/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /^Destination: United Kingdom/ })).toHaveAttribute('aria-pressed', 'true');
});

test('unknown admin sub-path redirects to the admin overview', async ({ page, api }) => {
  api.on('GET', /^\/admin-auth\/me$/, { id: 'a-e2e-1', email: 'admin@example.com', name: 'E2E Admin', role: 'super_admin' });
  await page.addInitScript(() => window.localStorage.setItem('wehive_admin_token', 'e2e-admin-token'));
  await page.goto('/admin/does-not-exist');
  await expect(page).toHaveURL(/\/admin$/);
});

test.describe('Google Knowledge Graph', () => {
  const KG = {
    name: 'University of Toronto', description: 'Public university in Toronto, Canada',
    detail: 'The University of Toronto is a public research university.', url: 'https://en.wikipedia.org/wiki/University_of_Toronto',
    image: '', types: ['CollegeOrUniversity'],
  };

  test('home search shows a Knowledge Graph card', async ({ page, api }) => {
    api
      .on('GET', /^\/countries$/, [])
      .on('GET', /^\/knowledge\/public\/lookup$/, { entity: KG });
    await page.goto('/');
    await page.getByTestId('hero-search-input').fill('University of Toronto');
    const card = page.getByTestId('hero-search-knowledge');
    await expect(card).toContainText('Public university in Toronto, Canada');
    await expect(card.getByRole('link', { name: 'Learn more' })).toHaveAttribute('href', KG.url);
  });

  test('home search works without a Knowledge Graph result', async ({ page, api }) => {
    api.on('GET', /^\/countries$/, [{ id: 'ca', name: 'Canada', visa_types: ['Tourist'] }]);
    await page.goto('/');
    await page.getByTestId('hero-search-input').fill('Canada');
    await expect(page.getByTestId('hero-search-result-ca')).toBeVisible();
    await expect(page.getByTestId('hero-search-knowledge')).toHaveCount(0);
  });

  test('travel planner shows the destination card', async ({ page, api }) => {
    await signIn(page, api);
    api.on('GET', /^\/travel\/planner$/, {
      cached: false,
      itinerary: [{ day: 1, theme: 'Arrival', activities: ['Beach walk'] }],
      destination: { name: 'Barbados', description: 'Island country', detail: 'Barbados is an island country in the Caribbean.', url: 'https://en.wikipedia.org/wiki/Barbados', image: '' },
    });
    await page.goto('/holiday/bb');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Barbados');
    await expect(page.getByTestId('planner-destination-card')).toContainText('island country in the Caribbean');
  });
});

test('landing page visa enquiry: choose a purpose, fill details, submit', async ({ page, api }) => {
  api.on('POST', /^\/leads\/enquiry$/, { ok: true, id: 'lead-9' }, 201);
  await page.goto('/');
  const form = page.getByTestId('enquiry-form');
  await form.scrollIntoViewIfNeeded();

  await page.getByTestId('enquiry-submit').click();
  await expect(page.getByTestId('enquiry-error')).toContainText('Choose what the trip is for');

  await page.getByTestId('enquiry-purpose-business').click();
  await form.getByLabel('Full name *').fill('Arjun Mehta');
  await form.getByLabel('Email *').fill('arjun@example.com');
  await form.getByLabel('Phone / WhatsApp *').fill('+91 98765 43210');
  await form.getByLabel('Destination country *').fill('Germany');
  await form.getByLabel('Travellers').selectOption('2');
  await form.getByLabel('Anything else we should know?').fill('Trade fair in Hannover');
  await page.getByTestId('enquiry-submit').click();
  await expect(page.getByTestId('enquiry-error')).toContainText('consent');
  await page.getByTestId('enquiry-consent').check();
  await page.getByTestId('enquiry-submit').click();

  await expect(page.getByTestId('enquiry-success')).toContainText('Germany');
  const body = api.calls.find((c) => c.path === '/leads/enquiry')?.body as Record<string, unknown>;
  expect(body).toMatchObject({
    purpose: 'business', name: 'Arjun Mehta', email: 'arjun@example.com', phone: '+91 98765 43210',
    destination: 'Germany', travellers: 2, message: 'Trade fair in Hannover', consent: true, travel_date: null, website: '',
  });
});

test('landing enquiry shows the server validation message', async ({ page, api }) => {
  api.on('POST', /^\/leads\/enquiry$/, { detail: [{ loc: ['body', 'phone'], msg: 'Value error, Enter a valid phone number with country code, e.g. +91 98765 43210' }] }, 422);
  await page.goto('/');
  const form = page.getByTestId('enquiry-form');
  await form.scrollIntoViewIfNeeded();
  await page.getByTestId('enquiry-purpose-student_f1').click();
  await form.getByLabel('Full name *').fill('Priya Sharma');
  await form.getByLabel('Email *').fill('priya@example.com');
  await form.getByLabel('Phone / WhatsApp *').fill('98765 43210');
  await form.getByLabel('Destination country *').fill('United States');
  await page.getByTestId('enquiry-consent').check();
  await page.getByTestId('enquiry-submit').click();
  await expect(page.getByTestId('enquiry-error')).toHaveText('Enter a valid phone number with country code, e.g. +91 98765 43210');
});

test('free consultation records the referring location from ?branch=', async ({ page, api }) => {
  api.on('POST', /^\/leads\/enquiry$/, { ok: true, id: 'lead-10' }, 201);
  await page.goto('/free-consultation?branch=habsiguda');
  const form = page.getByTestId('enquiry-form');
  await expect(form.getByLabel('Referred by location')).toHaveValue('habsiguda');
  await page.getByTestId('enquiry-purpose-tourist').click();
  await form.getByLabel('Full name *').fill('Priya Sharma');
  await form.getByLabel('Email *').fill('priya@example.com');
  await form.getByLabel('Phone / WhatsApp *').fill('+91 98765 43210');
  await form.getByLabel('Destination country *').fill('Canada');
  await page.getByTestId('enquiry-consent').check();
  await page.getByTestId('enquiry-submit').click();
  await expect(page.getByTestId('enquiry-success')).toBeVisible();
  expect(api.calls.find((c) => c.path === '/leads/enquiry')?.body).toMatchObject({ branch: 'habsiguda', source: 'free-consultation' });
});
