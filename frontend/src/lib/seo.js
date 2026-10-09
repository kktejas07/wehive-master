/**
 * SEO Optimization & Meta Tags Management for We Hive
 * Supports Title, Meta Description, Open Graph, Twitter Cards, Canonical URLs, and JSON-LD Structured Data.
 */

export const DEFAULT_SEO = {
  title: 'We Hive — One Visa to Access 29 Schengen Countries | Study & Travel Platform',
  description: 'Step into wonder with We Hive. Apply for Schengen visas, explore 29 European countries, compare university programs, and manage document AI all in one platform.',
  keywords: 'Schengen Visa, 29 Schengen Countries, Study in Europe, Student Alumni, Overseas Education, Visa AI, We Hive, European Travel',
  ogImage: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80',
  ogUrl: 'https://wehive.com',
  canonicalUrl: 'https://wehive.com',
  siteName: 'We Hive',
};

/**
 * Dynamically updates document head SEO tags
 * @param {object} customSEO - Partial SEO fields to override default config
 */
export function updateSEO(customSEO = {}) {
  const seo = { ...DEFAULT_SEO, ...customSEO };

  // 1. Update Document Title
  if (seo.title) {
    document.title = seo.title;
  }

  // Helper to set or create meta tag
  const setMetaTag = (selector, attributeName, attributeValue, content) => {
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attributeName, attributeValue);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  // 2. Standard Meta Tags
  if (seo.description) {
    setMetaTag('meta[name="description"]', 'name', 'description', seo.description);
  }
  if (seo.keywords) {
    setMetaTag('meta[name="keywords"]', 'name', 'keywords', seo.keywords);
  }

  // 3. Open Graph Tags
  setMetaTag('meta[property="og:title"]', 'property', 'og:title', seo.title);
  setMetaTag('meta[property="og:description"]', 'property', 'og:description', seo.description);
  setMetaTag('meta[property="og:image"]', 'property', 'og:image', seo.ogImage);
  setMetaTag('meta[property="og:url"]', 'property', 'og:url', seo.ogUrl || window.location.href);
  setMetaTag('meta[property="og:site_name"]', 'property', 'og:site_name', seo.siteName);
  setMetaTag('meta[property="og:type"]', 'property', 'og:type', 'website');

  // 4. Twitter Card Tags
  setMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
  setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', seo.title);
  setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', seo.description);
  setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', seo.ogImage);

  // 5. Canonical Link
  let canonicalEl = document.querySelector('link[rel="canonical"]');
  if (!canonicalEl) {
    canonicalEl = document.createElement('link');
    canonicalEl.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.setAttribute('href', seo.canonicalUrl || window.location.href);

  // 6. JSON-LD Structured Data
  injectStructuredData({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: seo.siteName,
    url: seo.ogUrl || window.location.href,
    description: seo.description,
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://wehive.com/search?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  });
}

/**
 * Injects JSON-LD structured data into head
 */
export function injectStructuredData(jsonLdObject) {
  let scriptEl = document.getElementById('wehive-structured-data');
  if (!scriptEl) {
    scriptEl = document.createElement('script');
    scriptEl.id = 'wehive-structured-data';
    scriptEl.type = 'application/ld+json';
    document.head.appendChild(scriptEl);
  }
  scriptEl.textContent = JSON.stringify(jsonLdObject, null, 2);
}
