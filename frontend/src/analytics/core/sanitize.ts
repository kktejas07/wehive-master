/**
 * PII Sanitizer & Param Normalizer
 * Enforces zero PII leaving the client device.
 */

import { CONFIG } from '../config';

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(\+?\d{1,4}[\s-]?)?\(?\d{2,5}\)?[\s-]?\d{3,5}[\s-]?\d{3,5}/g;
const ROLL_NUMBER_REGEX = /\b\d{2}[A-Z]{2,4}\d{4,6}\b/gi;
const NAME_LIKE_REGEX = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g;

/**
 * Scrubs PII from any text string and truncates to 100 chars
 */
export function sanitizeString(val: string): string {
  if (!val || typeof val !== 'string') return '';

  let sanitized = val
    .replace(EMAIL_REGEX, '[email]')
    .replace(PHONE_REGEX, '[phone]')
    .replace(ROLL_NUMBER_REGEX, '[roll]')
    .replace(NAME_LIKE_REGEX, '[name]');

  if (sanitized.length > CONFIG.MAX_PARAM_STRING_LEN) {
    sanitized = sanitized.substring(0, CONFIG.MAX_PARAM_STRING_LEN - 3) + '...';
  }

  return sanitized;
}

/**
 * Sanitizes element labels based on element ID and context
 */
export function sanitizeElementLabel(id: string, label?: string): string | undefined {
  if (!label) return undefined;

  // Drop label entirely for sensitive element types
  if (
    id.endsWith('.avatar') ||
    id.endsWith('.name') ||
    id.endsWith('.profile-row') ||
    id.includes('.user-')
  ) {
    return undefined;
  }

  return sanitizeString(label);
}

/**
 * Sanitizes entire event property payload object recursively
 */
export function sanitizeProperties(props: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, val] of Object.entries(props)) {
    if (val === null || val === undefined) continue;

    // Sanitize string values
    if (typeof val === 'string') {
      sanitized[key] = sanitizeString(val);
    } else if (typeof val === 'number' || typeof val === 'boolean') {
      sanitized[key] = val;
    } else if (Array.isArray(val)) {
      sanitized[key] = val.map(item => (typeof item === 'string' ? sanitizeString(item) : item));
    } else if (typeof val === 'object') {
      sanitized[key] = sanitizeProperties(val);
    }
  }

  return sanitized;
}
