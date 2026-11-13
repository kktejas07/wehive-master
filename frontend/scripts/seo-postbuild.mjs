#!/usr/bin/env node
/**
 * Runs after `craco build`. The app is a client-rendered SPA, so crawlers that
 * do not execute JavaScript (most AI crawlers, social link previews) would see
 * the same home-page <head> on every URL. For each public route this writes a
 * static HTML file whose <head> carries that route's title, description,
 * canonical, social tags and JSON-LD, plus a <noscript> summary with internal
 * links. The same script bundle still boots, so users get the normal app.
 *
 * Also writes sitemap.xml and llms.txt from the same route list. Country and
 * university pages come from the database; the backend lists those at
 * /api/sitemap.xml.
 *
 * Metadata comes from src/lib/seoCore.js — the code the app runs at runtime.
 * nginx serves the files via `try_files $uri $uri.html /index.html`.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = path.join(root, 'build');

// The sources are ES modules inside a CommonJS package; import them through .mjs copies.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wehive-seo-'));
async function load(rel) {
  const copy = path.join(tmp, path.basename(rel).replace(/\.js$/, '.mjs'));
  fs.copyFileSync(path.join(root, rel), copy);
  return import(pathToFileURL(copy).href);
}
const { routeSeo, indexablePaths, SITE_URL, SITE_NAME } = await load('src/lib/seoCore.js');
const { getPageTitle } = await load('src/lib/pageTitles.js');
const { COUNTRIES, FAQS, BRAND } = await load('src/data/mock.js');
const routes = JSON.parse(fs.readFileSync(path.join(root, 'src/data/seo-routes.json'), 'utf8'));
fs.rmSync(tmp, { recursive: true, force: true });

const siteUrl = (process.env.REACT_APP_SITE_URL || SITE_URL).replace(/\/$/, '');
const ctx = { routes, countries: COUNTRIES, faqs: FAQS, getTitle: getPageTitle, siteUrl };
const pages = indexablePaths(ctx).map((p) => routeSeo(p, ctx));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Replace exactly one match, or fail the build: a silent miss would ship wrong metadata. */
function swap(html, pattern, replacement, what) {
  if (!pattern.test(html)) throw new Error(`seo-postbuild: could not find ${what} in build/index.html`);
  return html.replace(pattern, replacement);
}
const metaContent = (attr, name) => new RegExp(`(<meta ${attr}="${name}" content=")[^"]*(")`);

function noscriptFor(page) {
  const links = pages
    .filter((p) => p.path !== page.path)
    .map((p) => `<li><a href="${p.path}">${esc(p.label)}</a></li>`)
    .join('');
  const faq = page.path === '/'
    ? `<h2>Frequently asked questions</h2>${FAQS.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}`
    : '';
  return `<noscript><h1>${esc(page.label)}</h1><p>${esc(page.description)}</p>${faq}`
    + `<h2>${esc(SITE_NAME)}</h2><ul>${links}</ul><p>This page needs JavaScript for its interactive features.</p></noscript>`;
}

function render(template, page) {
  let html = template;
  html = swap(html, /<title>[^<]*<\/title>/, `<title>${esc(page.title)}</title>`, '<title>');
  html = swap(html, metaContent('name', 'description'), `$1${esc(page.description)}$2`, 'meta description');
  html = swap(html, /(<link rel="canonical" href=")[^"]*(")/, `$1${page.canonicalUrl}$2`, 'canonical link');
  html = swap(html, metaContent('property', 'og:url'), `$1${page.canonicalUrl}$2`, 'og:url');
  html = swap(html, metaContent('property', 'og:title'), `$1${esc(page.title)}$2`, 'og:title');
  html = swap(html, metaContent('property', 'og:description'), `$1${esc(page.description)}$2`, 'og:description');
  html = swap(html, metaContent('name', 'twitter:title'), `$1${esc(page.title)}$2`, 'twitter:title');
  html = swap(html, metaContent('name', 'twitter:description'), `$1${esc(page.description)}$2`, 'twitter:description');
  // Same element id the runtime uses (lib/seo.js), so navigation updates this tag instead of adding a second one.
  const jsonLd = JSON.stringify(page.jsonLd).replace(/</g, '\\u003c');
  html = swap(html, /<\/head>/, `<script type="application/ld+json" id="wehive-structured-data">${jsonLd}</script></head>`, '</head>');
  html = swap(html, /<noscript>[\s\S]*?<\/noscript>/, noscriptFor(page), '<noscript>');
  return html;
}

const template = fs.readFileSync(path.join(buildDir, 'index.html'), 'utf8');
for (const page of pages) {
  const file = page.path === '/' ? 'index.html' : `${page.path.slice(1)}.html`;
  const out = path.join(buildDir, file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, render(template, page));
}

const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(
  path.join(buildDir, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${
    pages.map((p) => `  <url><loc>${p.canonicalUrl || siteUrl}</loc><lastmod>${today}</lastmod></url>`).join('\n')
  }\n</urlset>\n`,
);

// llms.txt (https://llmstxt.org): a plain-text map of the site for AI assistants.
const line = (p) => `- [${p.label}](${p.canonicalUrl}): ${p.description}`;
fs.writeFileSync(
  path.join(buildDir, 'llms.txt'),
  [
    `# ${SITE_NAME}`,
    '',
    `> ${routes['/'].description}`,
    '',
    `${SITE_NAME} (wehive.co.in) is a visa, study-abroad and travel service with walk-in branches in India and the USA.`,
    `Contact: ${BRAND.email}, ${BRAND.phone}. Hours: ${BRAND.hours}.`,
    'Visa rules, fees and processing times are set by each country and change; the visa pages show current details.',
    '',
    '## Main pages',
    ...pages.filter((p) => p.path !== '/').map(line),
    '',
    '## Visa and university pages',
    `- [Country visa guides and university pages](${siteUrl}/api/sitemap.xml): one page per destination at /visa/{country} and per university at /university/{id}.`,
    '',
  ].join('\n'),
);

console.log(`seo-postbuild: wrote ${pages.length} pages, sitemap.xml and llms.txt`);
