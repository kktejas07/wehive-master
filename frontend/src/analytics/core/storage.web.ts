/**
 * Offline Storage Queue Provider (*.web.ts)
 */

import { AnalyticsEventPayload } from '../types';

const STORAGE_KEY = 'wehive_analytics_offline_queue';

export function getOfflineQueue(): AnalyticsEventPayload[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveOfflineQueue(queue: AnalyticsEventPayload[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue.slice(-100)));
  } catch (e) {
    // Ignore storage quota errors
  }
}

export function clearOfflineQueue(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // Ignore storage errors
  }
}
