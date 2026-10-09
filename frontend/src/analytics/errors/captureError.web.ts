/**
 * Exception & Error Tracking Web Provider (*.web.ts)
 */

import { dispatcher } from '../core/dispatcher';
import { EVENTS } from '../constants/events';
import { getStandardEnvelope } from '../core/context';
import { breadcrumbs } from '../logging/breadcrumbs';

export interface ErrorContext {
  scope?: string;
  elementId?: string;
  screen?: string;
  severity?: 'warning' | 'error' | 'fatal';
  props?: Record<string, any>;
}

export function captureError(error: unknown, context: ErrorContext = {}) {
  const errObj = error instanceof Error ? error : new Error(String(error));
  const envelope = getStandardEnvelope();

  const payload = {
    ...envelope,
    scope: context.scope || 'general',
    element_id: context.elementId,
    screen: context.screen || envelope.screen,
    severity: context.severity || 'error',
    error_name: errObj.name,
    error_message: errObj.message,
    stack: errObj.stack,
    breadcrumbs: breadcrumbs.getBreadcrumbs(),
    ...context.props,
  };

  // 1. PostHog Exception Capture
  if (typeof window !== 'undefined' && (window as any).posthog) {
    try {
      (window as any).posthog.captureException(errObj, payload);
    } catch (e) {}
  }

  // 2. Dispatch app_error event to analytics pipeline
  dispatcher.dispatch(EVENTS.APP_ERROR, {
    error_type: errObj.name,
    error_message: errObj.message,
    scope: context.scope || 'app',
    fatal: context.severity === 'fatal',
  });

  // 3. Log error in console
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Analytics Error 🚨]', errObj, payload);
  }
}
