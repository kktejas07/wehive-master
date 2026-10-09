/**
 * Firebase / GA4 Analytics Web Provider (*.web.ts)
 */

import { AnalyticsProvider } from './types';
import { CONFIG } from '../config';
import { UserTraits } from '../types';

class FirebaseWebProvider implements AnalyticsProvider {
  name = 'firebase';
  private initialized = false;

  init() {
    if (this.initialized) return;
    this.initialized = true;

    if (process.env.NODE_ENV !== 'production') {
      console.log('[Analytics Provider 🔥] Firebase Analytics Web Provider Initialized');
    }
  }

  logEvent(eventName: string, properties: Record<string, any>) {
    if (!this.initialized) return;

    // 1. Hard-trim to 20-key priority subset for Firebase's 25-param cap
    const trimmedProps: Record<string, any> = {};
    for (const key of CONFIG.FIREBASE_PRIORITY_KEYS) {
      if (properties[key] !== undefined && properties[key] !== null) {
        let val = properties[key];
        if (typeof val === 'string' && val.length > 100) {
          val = val.substring(0, 97) + '...';
        }
        trimmedProps[key] = val;
      }
    }

    // 2. Format name to /^[a-z][a-z0-9_]{0,39}$/
    const safeEventName = eventName.toLowerCase().replace(/[^a-z0-9_]/g, '_').substring(0, 40);

    // 3. Dispatch to window.gtag / Firebase if present
    if (typeof window !== 'undefined' && (window as any).gtag) {
      try {
        (window as any).gtag('event', safeEventName, trimmedProps);
      } catch (e) {
        // Swallowed
      }
    }
  }

  setUserId(hashedUserId: string) {
    const measurementId = process.env.REACT_APP_FIREBASE_MEASUREMENT_ID;
    if (measurementId && typeof window !== 'undefined' && (window as any).gtag) {
      try {
        (window as any).gtag('config', measurementId, {
          user_id: hashedUserId,
        });
      } catch (e) {}
    }
  }

  setUserProperties(traits: UserTraits) {
    const safeTraits: Record<string, any> = {};
    let count = 0;

    for (const [key, val] of Object.entries(traits)) {
      if (count >= 25) break;
      const safeKey = key.substring(0, 24);
      let safeVal = typeof val === 'string' ? val.substring(0, 36) : val;
      safeTraits[safeKey] = safeVal;
      count++;
    }

    if (typeof window !== 'undefined' && (window as any).gtag) {
      try {
        (window as any).gtag('set', 'user_properties', safeTraits);
      } catch (e) {}
    }
  }

  reset() {
    this.setUserId('');
  }
}

export const firebaseProvider = new FirebaseWebProvider();
