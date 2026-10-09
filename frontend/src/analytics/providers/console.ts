/**
 * Console Debug Provider for Local Development
 */

import { AnalyticsProvider } from './types';
import { UserTraits } from '../types';

class ConsoleProvider implements AnalyticsProvider {
  name = 'console';

  init() {
    console.log('%c[Analytics 📊] Console Debug Provider Active', 'color: #38bdf8; font-weight: bold;');
  }

  logEvent(eventName: string, properties: Record<string, any>) {
    if (process.env.NODE_ENV === 'production' && !window.location.search.includes('debug=true')) {
      return;
    }

    console.groupCollapsed(
      `%c[Analytics 📊] ${eventName.toUpperCase()} %c(${properties.category || 'general'})`,
      'color: #0284c7; font-weight: bold;',
      'color: #94a3b8; font-style: italic;'
    );
    console.log('%cElement ID:', 'color: #f59e0b;', properties.element_id || 'none');
    console.log('%cScreen:', 'color: #a855f7;', properties.screen || 'home');
    console.log('%cPayload:', 'color: #38bdf8;', properties);
    console.groupEnd();
  }

  setUserId(userId: string) {
    console.log('%c[Analytics 📊] Set User ID:', 'color: #10b981;', userId);
  }

  setUserProperties(traits: UserTraits) {
    console.log('%c[Analytics 📊] Set User Traits:', 'color: #10b981;', traits);
  }

  reset() {
    console.log('%c[Analytics 📊] Reset User Session', 'color: #ef4444;');
  }
}

export const consoleProvider = new ConsoleProvider();
