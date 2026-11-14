/**
 * Route -> SEO metadata. Pure and import-free on purpose: the app uses it at
 * runtime (lib/seo.js) and scripts/seo-postbuild.mjs uses the same code at
 * build time to write per-route HTML, sitemap.xml and llms.txt, so the two can
 * never disagree.
 *
 * ctx = { routes: data/seo-routes.json, countries: COUNTRIES, faqs: FAQS,
 *         getTitle: getPageTitle, siteUrl? }
 */

export const SITE_URL = 'https://wehive.co.in';
export const SITE_NAME = 'We Hive';

// Signed-in, transactional and token pages: never useful in search results.
const NOINDEX_PREFIXES = [
  '/admin', '/account', '/agent', '/login', '/signin', '/signup', '/verify-email', '/__/',
  '/track/', '/shared/', '/newsletter/', '/post-approval', '/apply', '/assessment',
  '/visa-interview', '/financial-tools', '/visa-scheduling', '/sop-builder', '/wise',
  '/pre-departure', '/us-visa-slots',
];

// '/agent' covers /agent and /agent/login but not /agent-training; '/track/' covers only pages under /track.
const isNoindex = (path) =>
  NOINDEX_PREFIXES.some((p) => (p.endsWith('/') ? path.startsWith(p) : path === p || path.startsWith(`${p}/`)));

const normalize = (pathname) => (pathname || '/').replace(/\/+$/, '') || '/';

function visaCountry(path, countries) {
  const m = /^\/visa\/([a-z]{2})$/.exec(path);
  return m ? countries.find((c) => c.id === m[1]) : undefined;
}

export function routeSeo(pathname, ctx) {
  const { routes, countries, faqs, getTitle, siteUrl = SITE_URL } = ctx;
  const path = normalize(pathname);
  const url = `${siteUrl}${path === '/' ? '' : path}`;
  const country = visaCountry(path, countries);
  const meta = routes[path];

  let title = getTitle(path);
  let label = meta ? meta.label : title.split(' | ')[0];
  let description = meta ? meta.description : routes['/'].description;
  // Nested fixed pages (e.g. /destinations/ca) only have a generic prefix title; name them properly.
  if (meta && path.lastIndexOf('/') > 0) title = `${meta.label} | ${SITE_NAME}`;
  if (country) {
    label = `${country.name} Visa`;
    title = `${country.name} Visa from India: Requirements & How to Apply | ${SITE_NAME}`;
    description = `Apply for a ${country.name} visa from India with ${SITE_NAME}: the documents you need, how the application works, and tracking until a decision is made.`;
  }

  const jsonLd = [{ '@type': 'WebSite', name: SITE_NAME, url: siteUrl }];
  if (path === '/') {
    // The same questions and answers are visible on the home page (components/Faq.jsx).
    jsonLd.push({
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
  } else {
    jsonLd.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
        { '@type': 'ListItem', position: 2, name: label, item: url },
      ],
    });
  }

  return {
    path,
    title,
    label,
    description,
    canonicalUrl: url,
    noindex: isNoindex(path),
    jsonLd: { '@context': 'https://schema.org', '@graph': jsonLd },
  };
}

/**
 * Paths with a fixed URL: each gets its own static HTML file and a sitemap entry.
 * Country and university pages come from the database, so the backend lists
 * those at /api/sitemap.xml instead.
 */
export function indexablePaths(ctx) {
  return Object.keys(ctx.routes);
}
