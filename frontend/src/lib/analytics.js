/**
 * Comprehensive Analytics & Debug Tracking System for We Hive.
 * Supports PostHog, Console Debug Logs, Custom Event Dispatcher, and React Hooks.
 */

// Event Category Constants
export const EVENT_CATEGORIES = {
  NAVIGATION: 'navigation',
  CAROUSEL: 'carousel',
  INTERACTION: 'interaction',
  FORM: 'form',
  SEARCH: 'search',
  AI: 'ai',
  ERROR: 'error',
};

// Event Name Constants
export const EVENT_NAMES = {
  PAGE_VIEW: 'page_view',
  SCREEN_VIEW: 'screen_view',
  CLICK: 'button_click',
  COUNTRY_SELECT: 'country_select',
  CAROUSEL_NAV: 'carousel_nav_click',
  FORM_SUBMIT: 'form_submit',
  FILTER_CHANGE: 'filter_change',
  SEARCH_PERFORMED: 'search_performed',
  ERROR_OCCURRED: 'error_occurred',
};

/**
 * Dispatch an event to PostHog, custom window listeners, and print formatted debug logs.
 * @param {string} eventName - Name of the event (e.g. 'country_select')
 * @param {object} properties - Custom event payload
 * @param {string} category - Category grouping (e.g. 'carousel')
 */
export function trackEvent(eventName, properties = {}, category = EVENT_CATEGORIES.INTERACTION) {
  const timestamp = new Date().toISOString();
  const payload = {
    event: eventName,
    category,
    timestamp,
    page_path: window.location.pathname,
    page_title: document.title,
    user_agent: navigator.userAgent,
    screen_width: window.innerWidth,
    screen_height: window.innerHeight,
    ...properties,
  };

  // 1. PostHog Tracking
  if (window.posthog && typeof window.posthog.capture === 'function') {
    try {
      window.posthog.capture(eventName, payload);
    } catch (e) {
      console.warn('[Analytics 📊] PostHog capture failed:', e);
    }
  }

  // 2. Window Event Dispatch for custom analytics listeners
  try {
    const customEvent = new CustomEvent('wehive:analytics_event', { detail: payload });
    window.dispatchEvent(customEvent);
  } catch (e) {
    // Ignore DOM event errors
  }

  // 3. Formatted Debug Logging in Console (Active in dev or when debug flag is set)
  const isDebug = process.env.NODE_ENV !== 'production' || window.location.search.includes('debug=true');
  if (isDebug) {
    console.groupCollapsed(
      `%c[Analytics 📊] ${eventName.toUpperCase()} %c(${category})`,
      'color: #0284c7; font-weight: bold;',
      'color: #64748b; font-style: italic;'
    );
    console.log('%cTimestamp:', 'color: #94a3b8;', timestamp);
    console.log('%cProperties:', 'color: #38bdf8;', properties);
    console.log('%cFull Payload:', 'color: #a855f7;', payload);
    console.groupEnd();
  }
}

/**
 * Specific helper for country selection events in carousels/portals
 */
export function trackCountrySelect(countryId, countryName, index, total, source = 'schengen_portal') {
  trackEvent(
    EVENT_NAMES.COUNTRY_SELECT,
    {
      country_id: countryId,
      country_name: countryName,
      active_index: index,
      total_countries: total,
      source_component: source,
    },
    EVENT_CATEGORIES.CAROUSEL
  );
}

/**
 * Specific helper for page view / screen tracking
 */
export function trackPageView(pageName, extraProps = {}) {
  trackEvent(
    EVENT_NAMES.PAGE_VIEW,
    {
      page_name: pageName,
      url: window.location.href,
      referrer: document.referrer || 'direct',
      ...extraProps,
    },
    EVENT_CATEGORIES.NAVIGATION
  );
}

/**
 * React Hook for component interaction tracking
 */
export function useAnalytics() {
  return {
    trackEvent,
    trackCountrySelect,
    trackPageView,
    EVENT_NAMES,
    EVENT_CATEGORIES,
  };
}
