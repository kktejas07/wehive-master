/**
 * Analytics Provider Contract Interface
 */

import { UserTraits } from '../types';

export interface AnalyticsProvider {
  name: string;
  init(): void | Promise<void>;
  logEvent(eventName: string, properties: Record<string, any>): void;
  setUserId(userId: string): void;
  setUserProperties(traits: UserTraits): void;
  reset(): void;
  flush?(): Promise<void>;
}
