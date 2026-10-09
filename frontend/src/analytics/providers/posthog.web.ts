/**
 * PostHog Analytics Web Provider (*.web.ts)
 */

import { AnalyticsProvider } from './types';
import { CONFIG } from '../config';
import { UserTraits } from '../types';

class PostHogWebProvider implements AnalyticsProvider {
  name = 'posthog';
  private initialized = false;

  init() {
    if (this.initialized) return;
    this.initialized = true;

    if (typeof window !== 'undefined' && (window as any).posthog) {
      try {
        (window as any).posthog.init(CONFIG.POSTHOG_KEY, {
          api_host: CONFIG.POSTHOG_HOST,
          person_profiles: 'identified_only',
          capture_pageview: false,
          capture_pageleave: true,
          autocapture: true,
          session_recording: {
            maskAllInputs: true,
            maskTextSelector: '[data-ph-mask]',
          },
        });
        if (process.env.NODE_ENV !== 'production') {
          console.log('[Analytics Provider 🦔] PostHog Web Provider Initialized');
        }
      } catch (e) {
        console.warn('[Analytics 🦔] PostHog init error:', e);
      }
    }
  }

  logEvent(eventName: string, properties: Record<string, any>) {
    if (typeof window !== 'undefined' && (window as any).posthog) {
      try {
        // Enforce no '$' prefix on custom properties
        const safeProps: Record<string, any> = {};
        for (const [key, val] of Object.entries(properties)) {
          const safeKey = key.startsWith('$') ? key.replace(/^\$/, '') : key;
          safeProps[safeKey] = val;
        }

        (window as any).posthog.capture(eventName, safeProps);
      } catch (e) {
        console.warn('[Analytics 🦔] PostHog capture error:', e);
      }
    }
  }

  setUserId(hashedUserId: string) {
    if (typeof window !== 'undefined' && (window as any).posthog) {
      try {
        (window as any).posthog.identify(hashedUserId);
      } catch (e) {}
    }
  }

  setUserProperties(traits: UserTraits) {
    if (typeof window !== 'undefined' && (window as any).posthog) {
      try {
        (window as any).posthog.setPersonProperties(traits);
      } catch (e) {}
    }
  }

  reset() {
    if (typeof window !== 'undefined' && (window as any).posthog) {
      try {
        (window as any).posthog.reset();
      } catch (e) {}
    }
  }
}

export const posthogProvider = new PostHogWebProvider();
