import { test, expect, ApiMock } from './fixtures';
import type { Page } from '@playwright/test';

const ADMIN = { id: 'a-e2e-1', name: 'E2E Admin', email: 'e2e.admin@example.com', is_admin: true, is_super_admin: true };

async function adminSignIn(page: Page, api: ApiMock, admin = ADMIN) {
  api.on('GET', /^\/admin-auth\/me$/, admin);
  await page.addInitScript(() => window.localStorage.setItem('wehive_admin_token', 'e2e-admin-token'));
}

const LEAD = {
  id: 'lead-1', name: 'Priya Sharma', email: 'priya@example.com', message: 'Need help with an F-1 visa.',
  status: 'new', notes: [], created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:00:00Z',
};

test('leads inbox lists leads and changes status', async ({ page, api }) => {
  await adminSignIn(page, api);
  api
    .on('GET', /^\/admin\/leads$/, { items: [LEAD], total: 1, new: 1, limit: 25, skip: 0 })
    .on('PATCH', /^\/admin\/leads\/lead-1$/, { ...LEAD, status: 'contacted' });
  await page.goto('/admin/leads');

  await expect(page.getByTestId('admin-leads-new-count')).toHaveText('1');
  const row = page.getByTestId('admin-lead-row-lead-1');
  await expect(row).toContainText('Priya Sharma');
  await row.getByRole('button').first().click();
  await expect(page.getByTestId('admin-lead-reply-lead-1')).toHaveAttribute('href', /^mailto:priya@example\.com/);
  await page.getByTestId('admin-lead-status-lead-1').selectOption('contacted');

  await expect.poll(() => api.calls.find((c) => c.method === 'PATCH')?.body).toEqual({ status: 'contacted' });
});

test('payments shows paid totals', async ({ page, api }) => {
  await adminSignIn(page, api);
  api.on('GET', /^\/admin\/payments$/, {
    items: [{
      id: 'pay-1', user: { id: 'u1', name: 'Rahul', email: 'rahul@example.com' }, plan_id: 'premium', amount_inr: 12345,
      status: 'paid', razorpay_order_id: 'order_abc', razorpay_payment_id: 'pay_abc', created_at: '2026-10-02T10:00:00Z',
    }],
    total: 1, totals: { paid_inr: 12345, paid_count: 3 }, limit: 25, skip: 0,
  });
  await page.goto('/admin/payments');

  await expect(page.getByTestId('admin-payments-total-paid')).toContainText('12,345');
  await expect(page.getByTestId('admin-payments-paid-count')).toHaveText('3');
  await expect(page.getByTestId('admin-payment-row-pay-1')).toContainText('order_abc');
});

test('audit log renders field diffs', async ({ page, api }) => {
  await adminSignIn(page, api);
  api.on('GET', /^\/admin\/audit\/log$/, {
    items: [{
      id: 'au-1', at: '2026-10-03T10:00:00Z', admin_email: 'e2e.admin@example.com', admin_name: 'E2E Admin',
      action: 'update', entity_type: 'lead', entity_id: 'lead-1', diff: { status: { from: 'new', to: 'contacted' } }, extra: null,
    }],
    total: 1, entity_types: ['lead', 'application'], limit: 50, skip: 0,
  });
  await page.goto('/admin/audit');

  await expect(page.getByTestId('admin-audit-row-au-1')).toContainText('status: new → contacted');
  await expect(page.getByTestId('admin-audit-entity-filter').locator('option')).toHaveCount(3);
});

test('non-super admin does not get Settings', async ({ page, api }) => {
  await adminSignIn(page, api, { ...ADMIN, is_super_admin: false });
  api.on('GET', /^\/admin\/leads$/, { items: [], total: 0, new: 0, limit: 25, skip: 0 });
  await page.goto('/admin/leads');

  await expect(page.getByTestId('admin-leads-tab')).toBeVisible();
  await expect(page.getByTestId('admin-nav-leads')).toHaveCount(1);
  await expect(page.getByTestId('admin-nav-settings')).toHaveCount(0);
  await expect(page.getByTestId('admin-nav-admins')).toHaveCount(0);

  await page.goto('/admin/settings');
  await expect(page.getByTestId('admin-super-only')).toContainText('Only a super admin can access this');
});

test('a 401 from an admin call ends the session and redirects to login', async ({ page, api }) => {
  await adminSignIn(page, api);
  api.on('GET', /^\/admin\/payments$/, { detail: 'Token expired' }, 401);
  await page.goto('/admin/payments');

  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fpayments$/);
  expect(await page.evaluate(() => window.localStorage.getItem('wehive_admin_token'))).toBeNull();
});

const CASE = {
  id: 'app-1', status: 'submitted', country_id: 'ca', country_name: 'Canada', visa_type: 'Tourist', travel_date: '2026-10-24',
  applicants: 1, fee_inr: 4999, assigned_to: null, assignee: null, agent: null, form_data: { passport_number: 'Z1234567' },
  visa_appointment: { date: '2026-10-18', time: '10:00', embassy: 'VFS', city: 'Delhi' },
  timeline: [{ id: 't1', status: 'submitted', label: 'Application submitted', at: '2026-10-01T10:00:00Z' }],
  documents: [{ _id: 'doc-1', doc_type: 'passport', filename: 'passport.pdf', mime: 'application/pdf', status: 'uploaded', uploaded_at: '2026-10-02T10:00:00Z' }],
  messages: [{ _id: 'm1', from: 'user', name: 'Priya', text: 'Is my passport scan OK?', at: '2026-10-03T10:00:00Z' }],
  applicant: { id: 'u1', name: 'Priya Sharma', email: 'priya@example.com', phone: '+91 90000 00000', is_premium: false, joined_at: '2026-09-01T10:00:00Z' },
  internal_notes: [],
  scans: [{ id: 'sc1', kind: 'passport', created_at: '2026-10-02T11:00:00Z', extracted: { surname: 'SHARMA', issuer_verification: { found: true, name: 'Passport Seva' } } }],
  alerts: [{ kind: 'appointment', severity: 'critical', due: '2026-10-18', message: 'Embassy appointment in 2 day(s)' }],
};

async function openCase(page: Page, api: ApiMock) {
  await adminSignIn(page, api);
  api
    .on('GET', /^\/admin\/applications\/app-1\/case$/, CASE)
    .on('GET', /^\/admin\/staff\/workload$/, { staff: [{ id: 's-1', name: 'Asha', email: 'asha@example.com', staff_role: 'consultant', open_cases: 2 }], unassigned_open: 1 });
  await page.goto('/admin/applications/app-1');
  await expect(page.getByTestId('admin-case')).toBeVisible();
}

test('case page renders alerts and every section', async ({ page, api }) => {
  await openCase(page, api);
  await expect(page.getByRole('heading', { name: 'Priya Sharma' })).toBeVisible();
  await expect(page.getByTestId('case-alert-appointment')).toContainText('Embassy appointment in 2 day(s)');
  await expect(page.getByRole('tabpanel')).toContainText('Z1234567');

  await page.getByTestId('case-tab-documents').click();
  await expect(page.getByTestId('case-doc-status-doc-1')).toHaveText('uploaded');
  await page.getByTestId('case-tab-messages').click();
  await expect(page.getByText('Is my passport scan OK?')).toBeVisible();
  await page.getByTestId('case-tab-notes').click();
  await expect(page.getByTestId('case-notes-private')).toContainText('Only visible to staff');
  await page.getByTestId('case-tab-timeline').click();
  await expect(page.getByText('Application submitted')).toBeVisible();
  await page.getByTestId('case-tab-scans').click();
  await expect(page.getByTestId('case-scan-sc1')).toContainText('Issuer verified: Passport Seva');
});

test('rejecting a document requires a reason', async ({ page, api }) => {
  await openCase(page, api);
  api.on('PATCH', /^\/admin\/applications\/app-1\/documents\/doc-1$/, { ok: true, status: 'rejected' });
  await page.getByTestId('case-tab-documents').click();
  await page.getByTestId('case-doc-reject-doc-1').click();

  await expect(page.getByTestId('case-doc-submit-doc-1')).toBeDisabled();
  await page.getByTestId('case-doc-reason-doc-1').fill('Scan is blurry');
  await page.getByTestId('case-doc-submit-doc-1').click();
  await expect.poll(() => api.calls.find((c) => c.method === 'PATCH')?.body).toEqual({ status: 'rejected', reason: 'Scan is blurry' });
});

test('internal note is posted and shown', async ({ page, api }) => {
  await openCase(page, api);
  api.on('POST', /^\/admin\/applications\/app-1\/internal-notes$/, { id: 'n1', text: 'Called the embassy', by: 'e2e.admin@example.com', at: '2026-10-04T10:00:00Z' });
  await page.getByTestId('case-tab-notes').click();
  await page.getByTestId('case-note-input').fill('Called the embassy');
  await page.getByTestId('case-note-submit').click();

  await expect(page.getByText('Called the embassy')).toBeVisible();
  expect(api.calls.find((c) => c.method === 'POST')?.body).toEqual({ text: 'Called the embassy' });
});

test('assign dropdown calls the assign endpoint', async ({ page, api }) => {
  await openCase(page, api);
  api.on('PATCH', /^\/admin\/applications\/app-1\/assign$/, { ok: true, assignee: { id: 's-1', name: 'Asha', email: 'asha@example.com', staff_role: 'consultant' } });
  const select = page.getByTestId('case-assign-select');
  await expect(select.locator('option', { hasText: 'Asha (2 open)' })).toHaveCount(1);
  await select.selectOption('s-1');

  await expect.poll(() => api.calls.find((c) => c.method === 'PATCH')?.body).toEqual({ staff_id: 's-1' });
  await expect(select).toHaveValue('s-1');
});

test('overview alerts link to the case page', async ({ page, api }) => {
  await adminSignIn(page, api);
  api
    .on('GET', /^\/admin\/alerts$/, {
      items: [{ kind: 'appointment', severity: 'critical', due: '2026-10-18', message: 'Embassy appointment in 2 day(s)', application_id: 'app-1', status: 'submitted', country: 'Canada', visa_type: 'Tourist', applicant: 'Priya Sharma', assigned_to: null }],
      counts: { appointment: 1 }, total: 1,
    })
    .on('GET', /^\/admin\/applications\/app-1\/case$/, CASE);
  await page.goto('/admin');

  await expect(page.getByTestId('alerts-count-appointment')).toContainText('1');
  await expect(page.getByTestId('admin-nav-applications-critical')).toHaveText('1');
  await page.getByTestId('alert-link-app-1-appointment').click();
  await expect(page).toHaveURL(/\/admin\/applications\/app-1$/);
  await expect(page.getByTestId('case-alert-appointment')).toBeVisible();
});

const PROFILE_USER = {
  id: 'u-42', name: 'Ravi Kumar', email: 'ravi@example.com', phone: '+919900000000', is_admin: false, is_super_admin: false,
  is_staff: false, is_premium: true, email_verified: true, suspended: false, created_at: '2026-01-05T10:00:00Z',
};

test('user profile shows history and suspends with a reason', async ({ page, api }) => {
  await adminSignIn(page, api);
  api
    .on('GET', /^\/admin\/users\/u-42\/profile$/, {
      user: PROFILE_USER,
      applications: [{ id: 'app-9', country_name: 'Japan', visa_type: 'Tourist', status: 'submitted', created_at: '2026-09-01T10:00:00Z' }],
      payments: [{ id: 'p1', plan_id: 'premium', amount_inr: 4999, status: 'paid', created_at: '2026-09-01T10:00:00Z' }],
      paid_total_inr: 4999,
      history: [],
    })
    .on('POST', /^\/admin\/users\/u-42\/suspend$/, { ...PROFILE_USER, suspended: true, suspended_reason: 'Chargeback fraud', suspended_at: '2026-10-17T10:00:00Z' });
  await page.goto('/admin/users/u-42');

  const profile = page.getByTestId('admin-user-profile');
  await expect(profile).toContainText('Ravi Kumar');
  await expect(profile).toContainText('Japan');
  await expect(profile).toContainText('4,999');
  await expect(profile.getByRole('link', { name: /Japan/ })).toHaveAttribute('href', '/admin/applications/app-9');

  await page.getByTestId('suspend-user').click();
  const submit = page.getByRole('button', { name: 'Suspend account' });
  await expect(submit).toBeDisabled();
  await page.getByLabel(/Reason/).fill('Chargeback fraud');
  api.on('GET', /^\/admin\/users\/u-42\/profile$/, {
    user: { ...PROFILE_USER, suspended: true, suspended_reason: 'Chargeback fraud', suspended_at: '2026-10-17T10:00:00Z' },
    applications: [], payments: [], paid_total_inr: 0,
    history: [{ at: '2026-10-17T10:00:00Z', admin_email: ADMIN.email, action: 'suspend', extra: { reason: 'Chargeback fraud' } }],
  });
  await submit.click();

  await expect.poll(() => api.calls.find((c) => c.method === 'POST')?.body).toEqual({ reason: 'Chargeback fraud' });
  await expect(page.getByTestId('user-suspended-chip')).toBeVisible();
  await expect(page.getByTestId('unsuspend-user')).toBeVisible();
  await expect(profile).toContainText('“Chargeback fraud”');
});

test('system health lists services and their fixes', async ({ page, api }) => {
  await adminSignIn(page, api);
  api.on('GET', /^\/admin\/health$/, {
    overall: 'missing',
    checked_at: '2026-10-17T10:00:00',
    services: [
      { id: 'mongo', name: 'MongoDB', status: 'ok', detail: '', action: '' },
      { id: 'sherpa', name: 'Visa requirements (Sherpa)', status: 'missing', detail: '', action: 'Set SHERPA_API_KEY' },
    ],
  });
  await page.goto('/admin/health');

  await expect(page.getByTestId('health-overall')).toContainText('1 item(s) need attention');
  await expect(page.getByTestId('health-mongo')).toContainText('OK');
  await expect(page.getByTestId('health-sherpa')).toContainText('Set SHERPA_API_KEY');
});

test('overview funnel switches window', async ({ page, api }) => {
  await adminSignIn(page, api);
  const funnel = (n: number) => ({
    days: 90,
    steps: [
      { key: 'signups', label: 'Signed up', count: n, from_previous: null, from_top: 100 },
      { key: 'paid', label: 'Paid', count: 5, from_previous: 10, from_top: 5 },
    ],
    revenue: { paid_inr: 24995, paid_count: 5, avg_order_inr: 4999, by_month: [], by_plan: [{ plan_id: 'premium', amount_inr: 24995, count: 5 }] },
  });
  api
    .on('GET', /^\/admin\/metrics$/, {
      users: { total: 100, premium: 5, staff: 1, new_30d: 10, new_7d: 2 },
      applications: { total: 20, draft: 5, submitted: 5, in_review: 5, approved: 4, rejected: 1, new_30d: 6 },
      revenue: { total_inr: 0, last_30d_inr: 0, currency: 'INR' },
      countries: { total: 10, no_visa: 2 }, leads: { total: 0 }, saved_plans: { total: 0 },
      trend: [], top_countries: [], recent_activity: [],
    })
    .on('GET', /^\/admin\/funnel$/, funnel(100));
  await page.goto('/admin');

  await expect(page.getByTestId('funnel-signups')).toContainText('100');
  await expect(page.getByTestId('funnel-paid-revenue')).toContainText('24,995');
  await Promise.all([
    page.waitForRequest(/\/admin\/funnel\?days=365$/),
    page.getByRole('button', { name: '12 months' }).click(),
  ]);
  await expect(page.getByRole('button', { name: '12 months' })).toHaveAttribute('aria-pressed', 'true');
});
