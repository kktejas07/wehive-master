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

test('admin login asks for the 2FA code when it is on', async ({ page, api }) => {
  api
    .on('POST', /^\/admin-auth\/login$/, { mfa_required: true, mfa_token: 'ticket-1' })
    .on('POST', /^\/admin-auth\/login\/2fa$/, { access_token: 'mfa-session', token_type: 'bearer', user: ADMIN })
    .on('GET', /^\/admin-auth\/me$/, ADMIN);
  await page.goto('/admin/login');
  await page.getByTestId('admin-login-email').fill(ADMIN.email);
  await page.getByTestId('admin-login-password').fill('Correct-horse-1');
  await page.getByTestId('admin-login-submit').click();

  const submit = page.getByTestId('admin-2fa-submit');
  await expect(page.getByTestId('admin-2fa-form')).toBeVisible();
  await page.getByTestId('admin-2fa-code').fill('12a34 56');
  await expect(page.getByTestId('admin-2fa-code')).toHaveValue('123456');
  await submit.click();

  await expect.poll(() => api.calls.find((c) => c.path === '/admin-auth/login/2fa')?.body).toEqual({ mfa_token: 'ticket-1', code: '123456' });
  await expect(page).toHaveURL(/\/admin$/);
  expect(await page.evaluate(() => localStorage.getItem('wehive_admin_token'))).toBe('mfa-session');
});

test('turning on 2FA shows a QR code and then recovery codes', async ({ page, api }) => {
  await adminSignIn(page, api, { ...ADMIN, totp_enabled: false });
  api
    .on('POST', /^\/admin-auth\/2fa\/setup$/, { secret: 'JBSWY3DPEHPK3PXP', otpauth_uri: 'otpauth://totp/We%20Hive%20Admin:e2e?secret=JBSWY3DPEHPK3PXP' }) // verify:allow-secret (public demo TOTP key)
    .on('POST', /^\/admin-auth\/2fa\/enable$/, {
      recovery_codes: ['aaaaa-11111', 'bbbbb-22222'], access_token: 'new-mfa-token', user: { ...ADMIN, totp_enabled: true, recovery_codes_left: 2 },
    });
  await page.goto('/admin/security');

  await expect(page.getByTestId('2fa-status')).toContainText('off');
  await page.getByTestId('2fa-start').click();
  await expect(page.getByTestId('2fa-secret')).toHaveText('JBSWY3DPEHPK3PXP');
  await expect(page.getByAltText('QR code for your authenticator app')).toBeVisible();
  await page.getByLabel(/Enter the 6-digit code/).fill('654321');
  api.on('GET', /^\/admin-auth\/me$/, { ...ADMIN, totp_enabled: true, recovery_codes_left: 2 });
  await page.getByTestId('2fa-enable').click();

  await expect(page.getByTestId('recovery-codes')).toContainText('aaaaa-11111');
  await expect(page.getByTestId('2fa-status')).toContainText('on');
});

test('super admin refunds part of a payment', async ({ page, api }) => {
  await adminSignIn(page, api);
  const PAY = {
    id: 'pay-9', user: { id: 'u1', name: 'Rahul', email: 'rahul@example.com' }, plan_id: 'premium', amount_inr: 4999, refunded_inr: 0,
    status: 'paid', razorpay_order_id: 'order_x', razorpay_payment_id: 'pay_x', created_at: '2026-10-02T10:00:00Z',
  };
  api
    .on('GET', /^\/admin\/payments$/, { items: [PAY], total: 1, totals: { paid_inr: 4999, paid_count: 1 }, limit: 25, skip: 0 })
    .on('POST', /^\/admin\/payments\/pay-9\/refund$/, { id: 'pay-9', status: 'partially_refunded', refunded_inr: 1000, premium_revoked: false });
  await page.goto('/admin/payments');

  await page.getByTestId('refund-pay-9').click();
  const dialog = page.getByTestId('refund-dialog');
  await expect(dialog.getByLabel(/Amount/)).toHaveValue('4999');
  await dialog.getByLabel(/Amount/).fill('6000');
  await dialog.getByLabel(/Reason/).fill('Duplicate charge');
  await expect(page.getByTestId('refund-submit')).toBeDisabled();
  await dialog.getByLabel(/Amount/).fill('1000');
  await page.getByTestId('refund-submit').click();

  await expect.poll(() => api.calls.find((c) => c.method === 'POST')?.body)
    .toEqual({ amount_inr: 1000, reason: 'Duplicate charge', revoke_premium: true });
  await expect(dialog).toBeHidden();
});

test('newsletter send needs an explicit confirmation with the audience size', async ({ page, api }) => {
  await adminSignIn(page, api);
  api
    .on('GET', /^\/newsletter\/subscribers$/, { items: [], total: 0, counts: { active: 3 }, page: 1, limit: 50, pages: 0 })
    .on('GET', /^\/newsletter\/admin\/campaigns$/, { items: [], active_subscribers: 3 })
    .on('POST', /^\/newsletter\/admin\/campaigns$/, { id: 'c1', subject: 'October visa news', status: 'sending', recipients: 3, sent: 0, failed: 0 });
  await page.goto('/admin/newsletter');

  await page.getByLabel('Subject').fill('October visa news');
  await page.getByLabel('Message').fill('Schengen appointments open on **Monday**.');
  await page.getByTestId('newsletter-send').click();
  await expect(page.getByTestId('newsletter-confirm')).toContainText('3 confirmed subscribers');
  await page.getByTestId('newsletter-confirm-send').click();

  await expect.poll(() => api.calls.find((c) => c.method === 'POST')?.body).toEqual({
    subject: 'October visa news', body: 'Schengen appointments open on **Monday**.', expected_recipients: 3,
  });
});

test('document review flags a scan as suspicious with a note', async ({ page, api }) => {
  await adminSignIn(page, api);
  api
    .on('GET', /^\/admin\/review-queue$/, {
      items: [{
        id: 'scan-1', kind: 'passport', document: 'passport', title: 'Anna Eriksson', severity: 'critical', score: 5,
        flags: [{ kind: 'mrz_checksum', severity: 'critical', message: 'MRZ check digits fail for: passport number' }],
        user: { id: 'u1', name: 'Rahul Verma' }, application_id: 'app-1', review: null, created_at: '2026-10-16T10:00:00',
      }],
      total: 1, counts: { critical: 1, warning: 0, info: 0 },
    })
    .on('PATCH', /^\/admin\/review-queue\/scan-1$/, { id: 'scan-1', review: { decision: 'suspicious' } });
  await page.goto('/admin/review');

  const row = page.getByTestId('review-item-scan-1');
  await expect(row).toContainText('MRZ check digits fail');
  await expect(row.getByRole('link', { name: 'open case' })).toHaveAttribute('href', '/admin/applications/app-1');
  await page.getByTestId('review-flag-scan-1').click();
  await row.getByLabel(/What looks wrong/).fill('Check digit off by one');
  await row.getByRole('button', { name: 'Mark suspicious' }).click();

  await expect.poll(() => api.calls.find((c) => c.method === 'PATCH')?.body).toEqual({ decision: 'suspicious', note: 'Check digit off by one' });
  await expect(row).toBeHidden();
});

test('super admin changes another admin role', async ({ page, api }) => {
  await adminSignIn(page, api);
  api
    .on('GET', /^\/admin-auth\/admins$/, {
      items: [ADMIN, { id: 'a-2', name: 'Sam', email: 'sam@example.com', is_admin: true, has_password: true, admin_role: 'manager', totp_enabled: true }],
      roles: { manager: 'Full access', support: 'Cases', finance: 'Money', viewer: 'Read-only' },
    })
    .on('PATCH', /^\/admin-auth\/admins\/a-2\/role$/, { ok: true });
  await page.goto('/admin/admins');

  await expect(page.getByTestId('admin-admins-reset-2fa-a-2')).toBeVisible();
  await page.getByTestId('admin-admins-role-a-2').selectOption('viewer');
  await expect.poll(() => api.calls.find((c) => c.method === 'PATCH')?.body).toEqual({ admin_role: 'viewer' });
});

test('viewer role sees a read-only banner and no write controls', async ({ page, api }) => {
  await adminSignIn(page, api, { ...ADMIN, is_super_admin: false, admin_role: 'viewer' });
  api.on('GET', /^\/admin\/users\/u-42\/profile$/, { user: PROFILE_USER, applications: [], payments: [], paid_total_inr: 0, history: [] });
  await page.goto('/admin/users/u-42');

  await expect(page.getByTestId('admin-role-banner')).toContainText('Viewer');
  await expect(page.getByTestId('admin-user-profile')).toContainText('Ravi Kumar');
  await expect(page.getByTestId('suspend-user')).toHaveCount(0);
});

test('when 2FA is required, every page sends the admin to My security', async ({ page, api }) => {
  await adminSignIn(page, api, { ...ADMIN, totp_enabled: false, two_factor_required: true });
  await page.goto('/admin/payments');

  await expect(page).toHaveURL(/\/admin\/security$/);
  await expect(page.getByTestId('admin-2fa-required')).toBeVisible();
  await expect(page.getByTestId('2fa-start')).toBeVisible();
});
