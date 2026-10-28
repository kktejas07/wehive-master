/**
 * Unit tests for frontend/src/lib/pageTitles.js
 * Covers: getPageTitle for all major static and dynamic routes
 */

import { getPageTitle } from '../lib/pageTitles';

const SITE_NAME = 'We Hive';

describe('getPageTitle()', () => {
  // Static routes
  it('returns default title for /', () => {
    const title = getPageTitle('/');
    expect(title).toContain(SITE_NAME);
  });

  it('returns correct title for /about', () => {
    expect(getPageTitle('/about')).toContain('About');
  });

  it('returns correct title for /pricing', () => {
    expect(getPageTitle('/pricing')).toContain('Pricing');
  });

  it('returns correct title for /login', () => {
    expect(getPageTitle('/login')).toMatch(/sign in/i);
  });

  it('returns correct title for /signup', () => {
    expect(getPageTitle('/signup')).toMatch(/account|register|sign up/i);
  });

  it('returns correct title for /account', () => {
    expect(getPageTitle('/account')).toMatch(/account/i);
  });

  it('returns correct title for /track', () => {
    expect(getPageTitle('/track')).toMatch(/track/i);
  });

  it('returns correct title for /assessment', () => {
    expect(getPageTitle('/assessment')).toMatch(/assessment/i);
  });

  it('returns correct title for /help', () => {
    expect(getPageTitle('/help')).toMatch(/help/i);
  });

  it('returns correct title for /contact', () => {
    expect(getPageTitle('/contact')).toMatch(/contact/i);
  });

  it('returns correct title for /student-visa', () => {
    expect(getPageTitle('/student-visa')).toMatch(/student/i);
  });

  it('returns correct title for /map', () => {
    expect(getPageTitle('/map')).toMatch(/destination|map|explore/i);
  });

  it('returns correct title for /visa-checker', () => {
    expect(getPageTitle('/visa-checker')).toMatch(/visa checker/i);
  });

  it('returns correct title for /events', () => {
    expect(getPageTitle('/events')).toMatch(/event/i);
  });

  it('returns correct title for /news', () => {
    expect(getPageTitle('/news')).toMatch(/news/i);
  });

  it('returns correct title for /blog', () => {
    expect(getPageTitle('/blog')).toMatch(/blog/i);
  });

  it('returns correct title for /hive', () => {
    expect(getPageTitle('/hive')).toMatch(/hive/i);
  });

  // Dynamic routes
  it('handles dynamic /visa/:id route', () => {
    const title = getPageTitle('/visa/us');
    expect(title).toBeTruthy();
    expect(title).toContain(SITE_NAME);
  });

  it('handles dynamic /destinations/:id route', () => {
    const title = getPageTitle('/destinations/united-states');
    expect(title).toBeTruthy();
    expect(title).toContain(SITE_NAME);
  });

  it('handles /track/:id dynamic route', () => {
    const title = getPageTitle('/track/abc123');
    expect(title).toBeTruthy();
  });

  it('handles /university/:id dynamic route', () => {
    const title = getPageTitle('/university/oxford');
    expect(title).toBeTruthy();
  });

  // Admin routes
  it('handles /admin/* routes', () => {
    const title = getPageTitle('/admin');
    expect(title).toBeTruthy();
    expect(title).toContain(SITE_NAME);
  });

  // Newsletter sub-routes
  it('returns confirm subscription title for /newsletter/confirm', () => {
    expect(getPageTitle('/newsletter/confirm')).toMatch(/confirm|subscription/i);
  });

  it('returns unsubscribe title for /newsletter/unsubscribe', () => {
    expect(getPageTitle('/newsletter/unsubscribe')).toMatch(/unsubscribe/i);
  });

  // Unknown routes
  it('returns a non-empty string for unknown routes', () => {
    const title = getPageTitle('/some/unknown/path');
    expect(title).toBeTruthy();
    expect(typeof title).toBe('string');
    expect(title.length).toBeGreaterThan(0);
  });

  it('returns default title for empty string', () => {
    const title = getPageTitle('');
    expect(title).toBeTruthy();
    expect(title).toContain(SITE_NAME);
  });
});
