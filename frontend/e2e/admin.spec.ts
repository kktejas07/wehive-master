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
