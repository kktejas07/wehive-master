/**
 * Logger Redaction & Secrets Protection
 */

import { sanitizeString } from '../core/sanitize';

const SECRET_KEY_PATTERN = /password|secret|token|otp|api_key|authorization|bearer|jwt/i;
const JWT_PATTERN = /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g;

export function redactLogAttributes(attrs: Record<string, any>): Record<string, any> {
  const redacted: Record<string, any> = {};

  for (const [key, val] of Object.entries(attrs)) {
    if (SECRET_KEY_PATTERN.test(key)) {
      redacted[key] = '[redacted]';
      continue;
    }

    if (typeof val === 'string') {
      let strVal = val.replace(JWT_PATTERN, '[jwt_redacted]');
      strVal = sanitizeString(strVal);
      if (strVal.length > 2000) {
        strVal = strVal.substring(0, 1997) + '...[truncated]';
      }
      redacted[key] = strVal;
    } else if (typeof val === 'object' && val !== null) {
      redacted[key] = redactLogAttributes(val);
    } else {
      redacted[key] = val;
    }
  }

  return redacted;
}
