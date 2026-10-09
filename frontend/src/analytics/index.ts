/**
 * Unified Analytics Public API Entrypoint
 * Supports Firebase Analytics, PostHog, Console Provider, Logging, and Error Tracking.
 */

import { dispatcher } from './core/dispatcher';
import { EVENTS, AnalyticsEvent } from './constants/events';
import { ANALYTICS_IDS } from './constants/ids';
import { UserTraits } from './types';

// Public API Functions
export function track(event: AnalyticsEvent | string, props: Record<string, any> = {}): void {
  dispatcher.dispatch(event, props);
}

export function trackClick(id: string, props: Record<string, any> = {}): void {
  dispatcher.dispatch(EVENTS.ELEMENT_CLICK, { element_id: id, ...props });
}

export function trackImpression(id: string, props: Record<string, any> = {}): void {
  dispatcher.dispatch(EVENTS.ELEMENT_IMPRESSION, { element_id: id, ...props });
}

export function trackScreen(name: string, props: Record<string, any> = {}): void {
  dispatcher.dispatch(EVENTS.SCREEN_VIEW, { screen_name: name, ...props });
}

export function identify(userId: string, traits?: UserTraits): void {
  dispatcher.identify(userId, traits);
}

export function setUserProperties(traits: UserTraits): void {
  dispatcher.setUserProperties(traits);
}

export function reset(): void {
  dispatcher.reset();
}

export function flush(): Promise<void> {
  return dispatcher.flush();
}

// Export Hooks
export { useScreenAnalytics } from './hooks/useScreenAnalytics';
export { useImpression } from './hooks/useImpression';
export { useTrackedPress } from './hooks/useTrackedPress';
export { useFormAnalytics } from './hooks/useFormAnalytics';
export { useFlow } from './hooks/useFlow';
export { useListAnalytics } from './hooks/useListAnalytics';

// Export Components
export { Trackable } from './components/Trackable';
export { TrackedPressable } from './components/TrackedPressable';
export { AnalyticsRoot } from './components/AnalyticsRoot';
export { AnalyticsErrorBoundary } from './errors/ErrorBoundary';

// Export Logging & Errors
export { logger as log } from './logging/logger';
export { captureError } from './errors/captureError';

// Export Registries & Constants
export { EVENTS } from './constants/events';
export { ANALYTICS_IDS } from './constants/ids';
export { CONFIG } from './config';
