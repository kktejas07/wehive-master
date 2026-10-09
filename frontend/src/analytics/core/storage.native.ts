/**
 * Offline Storage Queue Provider Stub (*.native.ts)
 */

import { AnalyticsEventPayload } from '../types';
import { NotImplementedYet } from './context.native';

export function getOfflineQueue(): AnalyticsEventPayload[] {
  throw new NotImplementedYet('storage.native -> getOfflineQueue');
}

export function saveOfflineQueue(queue: AnalyticsEventPayload[]): void {
  throw new NotImplementedYet('storage.native -> saveOfflineQueue');
}

export function clearOfflineQueue(): void {
  throw new NotImplementedYet('storage.native -> clearOfflineQueue');
}
