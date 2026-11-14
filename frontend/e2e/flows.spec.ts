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

test('application fee is paid before the application is submitted', async ({ page, api, signIn }) => {
  await signIn();
  const DOCS = ['passport', 'photographs'];
  const application = (status: string) => ({
    id: 'app-fee-1', country_id: 'fr', visa_type: 'Tourist', status, applicants: 1, form_data: {}, timeline: [],
    documents: DOCS.map((d) => ({ id: d, doc_type: d, status: 'reviewing', filename: `${d}.pdf` })),
  });
  let paid = false;
  api
    .on('GET', /^\/users\/me\/applications\/app-fee-1$/, application('draft'))
    .on('GET', /^\/users\/me\/applications\/app-fee-1\/documents$/, application('draft').documents)
    .on('GET', /^\/users\/me\/applications\/app-fee-1\/messages$/, [])
    .on('GET', /^\/users\/me\/applications\/app-fee-1\/required-documents$/, { mandatory: DOCS, missing_docs: [] })
    .on('GET', /^\/countries\/fr$/, { id: 'fr', name: 'France', flag: '🇫🇷', categories: { Tourist: { documents: [] } } })
    .on('GET', /^\/payments\/application\/app-fee-1\/quote$/,
      { pay_now_inr: 9800, pay_later_inr: 4472, total_inr: 14272, due_now_inr: 9800, paid: false, paid_inr: 0, online_payment: true })
    .on('POST', /^\/payments\/application\/app-fee-1\/create-order$/,
      { order_id: 'mock-1', amount: 980000, amount_inr: 9800, currency: 'INR', razorpay_key: 'mock', application_id: 'app-fee-1' })
    .on('POST', /^\/payments\/application\/verify$/, { ok: true, paid: true, amount_inr: 9800 })
    .on('POST', /^\/users\/me\/applications\/app-fee-1\/submit$/, { ok: true, status: 'submitted' });
  await page.goto('/account/applications/app-fee-1');

  await expect(page.getByTestId('application-fee-note')).toContainText('₹9,800 are paid when you submit');
  page.on('request', (r) => { if (r.url().endsWith('/payments/application/verify')) paid = true; });
  await page.getByRole('button', { name: 'Pay ₹9,800 & submit' }).click();

  await expect(page.getByText('Payment received and application submitted').first()).toBeVisible(); // the toast also has a screen-reader copy
  const posts = api.calls.filter((c) => c.method === 'POST' && /payments|submit/.test(c.path)).map((c) => c.path);
  expect(paid).toBe(true);
  expect(posts).toEqual([
    '/payments/application/app-fee-1/create-order',
    '/payments/application/verify',
    '/users/me/applications/app-fee-1/submit',
  ]);
});

test('service fee and GST can be paid online after the application is submitted', async ({ page, api, signIn }) => {
  await signIn();
  const app = { id: 'app-fee-2', country_id: 'fr', visa_type: 'Tourist', status: 'submitted', applicants: 1, form_data: {}, timeline: [], documents: [] };
  api
    .on('GET', /^\/users\/me\/applications\/app-fee-2$/, app)
    .on('GET', /^\/users\/me\/applications\/app-fee-2\/(documents|messages)$/, [])
    .on('GET', /^\/users\/me\/applications\/app-fee-2\/required-documents$/, { mandatory: ['passport'], missing_docs: [] })
    .on('GET', /^\/countries\/fr$/, { id: 'fr', name: 'France', flag: '🇫🇷', categories: { Tourist: { documents: [] } } })
    .on('GET', /^\/payments\/application\/app-fee-2\/quote$/, {
      pay_now_inr: 9800, pay_later_inr: 4472, total_inr: 14272, due_now_inr: 0, paid: true, paid_inr: 9800,
      service_due_inr: 4472, service_paid: false, service_paid_inr: 0, online_payment: true,
    })
    .on('POST', /^\/payments\/application\/app-fee-2\/create-order$/,
      { order_id: 'mock-2', amount: 447200, amount_inr: 4472, currency: 'INR', razorpay_key: 'mock', application_id: 'app-fee-2', part: 'service_fee' })
    .on('POST', /^\/payments\/application\/verify$/, { ok: true, paid: true, amount_inr: 4472 });
  await page.goto('/account/applications/app-fee-2');

  await expect(page.getByTestId('application-fee-note')).toContainText('Application fee paid: ₹9,800');
  await page.getByTestId('pay-service-fee').click();
  await expect(page.getByText('Service fee paid', { exact: true }).first()).toBeVisible();
  expect(api.calls.find((c) => c.method === 'POST' && c.path.endsWith('/create-order'))?.body).toEqual({ part: 'service_fee' });
});
