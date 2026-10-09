/**
 * Dev-Time Assertion & Validation Layer
 */

import { EVENTS } from '../constants/events';
import { CONFIG } from '../config';

const VALID_EVENT_NAMES = new Set(Object.values(EVENTS));

/**
 * Validates payload parameters during development.
 * Emits loud console warnings/errors without throwing runtime exceptions.
 */
export function validateEventPayload(eventName: string, properties: Record<string, any>): void {
  if (process.env.NODE_ENV === 'production') return;

  // 1. Unknown Event Name Assertion
  if (!VALID_EVENT_NAMES.has(eventName as any)) {
    console.error(
      `%c[Analytics Validation ⚠️] Unknown Event Name: "${eventName}". Must be defined in EVENTS registry.`,
      'color: #ef4444; font-weight: bold;'
    );
  }

  // 2. Element ID check for interaction events
  if (
    (eventName === EVENTS.ELEMENT_CLICK || eventName === EVENTS.ELEMENT_IMPRESSION) &&
    !properties.element_id
  ) {
    console.warn(
      `%c[Analytics Validation ⚠️] Event "${eventName}" missing "element_id". Standard envelope requires a canonical ID.`,
      'color: #f59e0b; font-weight: bold;'
    );
  }

  // 3. Firebase 25 Param Cap Validation
  const paramKeys = Object.keys(properties);
  if (paramKeys.length > 25) {
    console.warn(
      `%c[Analytics Validation ⚠️] Firebase parameter limit exceeded! Event "${eventName}" has ${paramKeys.length} params (Max 25 for Firebase). Trimming will occur.`,
      'color: #f59e0b; font-weight: bold;'
    );
  }

  // 4. Event Name Length & Format (Firebase constraint)
  if (eventName.length > CONFIG.MAX_EVENT_NAME_LEN) {
    console.error(
      `%c[Analytics Validation ⚠️] Event name "${eventName}" exceeds ${CONFIG.MAX_EVENT_NAME_LEN} chars!`,
      'color: #ef4444; font-weight: bold;'
    );
  }

  if (/^(firebase_|google_|ga_|\$)/.test(eventName)) {
    console.error(
      `%c[Analytics Validation ⚠️] Event name "${eventName}" uses reserved vendor prefix!`,
      'color: #ef4444; font-weight: bold;'
    );
  }
}
