/**
 * Analytics Dispatcher & Fan-Out Core
 * Dispatches normalized, sanitized events across registered providers.
 */

import { AnalyticsProvider } from '../providers/types';
import { firebaseProvider } from '../providers/firebase';
import { posthogProvider } from '../providers/posthog';
import { consoleProvider } from '../providers/console';
import { getStandardEnvelope } from './context';
import { sanitizeProperties } from './sanitize';
import { validateEventPayload } from './validate';
import { getOfflineQueue, saveOfflineQueue, clearOfflineQueue } from './storage';
import { CONFIG } from '../config';
import { AnalyticsEventPayload, UserTraits } from '../types';

class AnalyticsDispatcher {
  private providers: AnalyticsProvider[] = [firebaseProvider, posthogProvider, consoleProvider];
  private queue: AnalyticsEventPayload[] = [];
  private flushTimer: any = null;

  constructor() {
    this.init();
  }

  private init() {
    try {
      this.providers.forEach(p => p.init());

      // Replay offline queue if present
      const offlineEvents = getOfflineQueue();
      if (offlineEvents.length > 0) {
        offlineEvents.forEach(evt => this.dispatchPayload(evt));
        clearOfflineQueue();
      }

      // Auto flush timer
      this.flushTimer = setInterval(() => this.flush(), CONFIG.QUEUE_FLUSH_INTERVAL_MS);

      // Flush on page unload / hide
      if (typeof window !== 'undefined') {
        window.addEventListener('pagehide', () => this.flush());
        window.addEventListener('beforeunload', () => this.flush());
      }
    } catch (e) {
      console.warn('[Analytics Dispatcher] Init error:', e);
    }
  }

  /**
   * Main dispatch method called by public API
   */
  dispatch(eventName: string, callerProps: Record<string, any> = {}) {
    // 1. Sampling Check
    if (this.shouldSampleOut(eventName)) return;

    // 2. Build Envelope: Merge caller props with standard envelope
    const envelope = getStandardEnvelope();
    const rawProps = { ...envelope, ...callerProps };

    // 3. Sanitize Payload (PII scrub & truncation)
    const sanitizedProps = sanitizeProperties(rawProps);

    // 4. Validate in __DEV__
    validateEventPayload(eventName, sanitizedProps);

    const payload: AnalyticsEventPayload = {
      name: eventName,
      properties: sanitizedProps,
      timestamp: new Date().toISOString(),
    };

    // 5. Queue & Fan-Out
    this.queue.push(payload);
    this.dispatchPayload(payload);

    if (this.queue.length >= CONFIG.QUEUE_FLUSH_BATCH_SIZE) {
      this.flush();
    }
  }

  private dispatchPayload(payload: AnalyticsEventPayload) {
    this.providers.forEach(provider => {
      try {
        provider.logEvent(payload.name, payload.properties);
      } catch (e) {
        // Never throw into app render
      }
    });
  }

  private shouldSampleOut(eventName: string): boolean {
    if (process.env.NODE_ENV !== 'production') return false;
    const rate = (CONFIG.SAMPLING_RATES as any)[eventName];
    if (rate !== undefined) {
      return Math.random() > rate;
    }
    return false;
  }

  identify(userId: string, traits?: UserTraits) {
    const hashed = this.hashUserId(userId);
    this.providers.forEach(p => {
      try {
        p.setUserId(hashed);
        if (traits) p.setUserProperties(traits);
      } catch (e) {}
    });
  }

  setUserProperties(traits: UserTraits) {
    const sanitized = sanitizeProperties(traits);
    this.providers.forEach(p => {
      try {
        p.setUserProperties(sanitized);
      } catch (e) {}
    });
  }

  reset() {
    this.providers.forEach(p => {
      try {
        p.reset();
      } catch (e) {}
    });
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const itemsToFlush = [...this.queue];
    this.queue = [];

    for (const provider of this.providers) {
      if (provider.flush) {
        try {
          await provider.flush();
        } catch (e) {}
      }
    }
  }

  private hashUserId(userId: string): string {
    // Simple deterministic hash for user ID across web/mobile
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return 'usr_' + Math.abs(hash).toString(36);
  }
}

export const dispatcher = new AnalyticsDispatcher();
