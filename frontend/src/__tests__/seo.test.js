/**
 * Unit tests for route SEO: lib/seoCore.js (pure metadata, shared with the
 * build script) and lib/seo.js (writes it into <head> on navigation).
 */
import ROUTES from '../data/seo-routes.json';
import { COUNTRIES, FAQS } from '../data/mock';
import { getPageTitle } from '../lib/pageTitles';
import { routeSeo, indexablePaths, SITE_URL } from '../lib/seoCore';
import { applyRouteSeo } from '../lib/seo';

const ctx = { routes: ROUTES, countries: COUNTRIES, faqs: FAQS, getTitle: getPageTitle };
const seo = (path) => routeSeo(path, ctx);
const types = (s) => s.jsonLd['@graph'].map((n) => n['@type']);

describe('routeSeo()', () => {
  it('gives every fixed public page its own title, description and canonical URL', () => {
    const pages = indexablePaths(ctx).map(seo);
    expect(pages.length).toBeGreaterThan(20);
    for (const p of pages) {
      expect(p.noindex).toBe(false);
      expect(p.description.length).toBeGreaterThanOrEqual(50);
      expect(p.description.length).toBeLessThanOrEqual(170);
      expect(p.canonicalUrl).toBe(p.path === '/' ? SITE_URL : SITE_URL + p.path);
    }
    expect(new Set(pages.map((p) => p.title)).size).toBe(pages.length);
    expect(new Set(pages.map((p) => p.description)).size).toBe(pages.length);
  });

  it('marks the home page up as an FAQ using the questions shown on it', () => {
    const home = seo('/');
    expect(types(home)).toEqual(['WebSite', 'FAQPage']);
    const faq = home.jsonLd['@graph'][1];
    expect(faq.mainEntity).toHaveLength(FAQS.length);
    expect(faq.mainEntity[0]).toEqual({
      '@type': 'Question', name: FAQS[0].q, acceptedAnswer: { '@type': 'Answer', text: FAQS[0].a },
    });
  });

  it('gives other pages a breadcrumb back to the home page', () => {
    const about = seo('/about');
    expect(types(about)).toEqual(['WebSite', 'BreadcrumbList']);
    expect(about.jsonLd['@graph'][1].itemListElement.map((i) => i.item)).toEqual([SITE_URL, `${SITE_URL}/about`]);
  });

  it('names country visa pages after the country', () => {
    const fr = seo('/visa/fr');
    expect(fr.title).toBe('France Visa from India: Requirements & How to Apply | We Hive');
    expect(fr.description).toContain('France visa');
    expect(fr.noindex).toBe(false);
    // an unknown country keeps the generic title rather than inventing a name
    expect(seo('/visa/zz').title).toBe(getPageTitle('/visa/zz'));
  });

  it('names nested fixed pages from their label', () => {
    expect(seo('/destinations/ca').title).toBe('Canada Destination Guide | We Hive');
  });

  it('keeps signed-in, token and admin pages out of search results', () => {
    for (const p of ['/admin', '/admin/users', '/account', '/agent', '/agent/login', '/login', '/signup',
      '/track/WH-123', '/shared/abc', '/sop-builder', '/apply/universities', '/newsletter/confirm']) {
      expect([p, seo(p).noindex]).toEqual([p, true]);
    }
  });

  it('does not let a noindex prefix swallow a public page with a similar name', () => {
    expect(seo('/agent-training').noindex).toBe(false); // not under /agent
    expect(seo('/track').noindex).toBe(false); // only /track/<id> is private
    expect(seo('/visa-checker').noindex).toBe(false);
  });

  it('treats a trailing slash as the same page', () => {
    expect(seo('/about/')).toEqual(seo('/about'));
    expect(seo('').canonicalUrl).toBe(SITE_URL);
  });

  it('does not advertise a site search the app does not have', () => {
    expect(JSON.stringify(seo('/').jsonLd)).not.toContain('SearchAction');
  });
});

describe('applyRouteSeo()', () => {
  const meta = (sel) => document.head.querySelector(sel)?.getAttribute('content');

  it('writes the route metadata into <head>', () => {
    applyRouteSeo('/pricing');
    expect(document.title).toBe('Pricing | We Hive');
    expect(meta('meta[name="description"]')).toBe(ROUTES['/pricing'].description);
    expect(meta('meta[property="og:title"]')).toBe('Pricing | We Hive');
    expect(meta('meta[property="og:url"]')).toBe(`${SITE_URL}/pricing`);
    expect(meta('meta[name="robots"]')).toBe('index, follow');
    expect(document.head.querySelector('link[rel="canonical"]').getAttribute('href')).toBe(`${SITE_URL}/pricing`);
  });

  it('replaces, rather than stacks, tags as the user navigates', () => {
    applyRouteSeo('/about');
    applyRouteSeo('/admin/users');
    expect(meta('meta[name="robots"]')).toBe('noindex, nofollow');
    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    const scripts = document.head.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts).toHaveLength(1);
    expect(JSON.parse(scripts[0].textContent)['@graph'][1]['@type']).toBe('BreadcrumbList');
  });
});
