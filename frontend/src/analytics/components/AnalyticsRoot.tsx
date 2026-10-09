/**
 * Analytics App Root Wrapper
 * Initializes early global error listeners, consent gates, and debug overlay.
 */

import React, { useEffect } from 'react';
import { AnalyticsDebugOverlay } from '../dev/AnalyticsDebugOverlay';
import { captureError } from '../errors/captureError';

interface Props {
  children: React.ReactNode;
}

export function AnalyticsRoot({ children }: Props) {
  useEffect(() => {
    // Synchronous unhandled error listener
    const handleGlobalError = (event: ErrorEvent) => {
      captureError(event.error || event.message, { scope: 'global_unhandled_error', severity: 'error' });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      captureError(event.reason, { scope: 'unhandled_promise_rejection', severity: 'error' });
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <>
      {children}
      <AnalyticsDebugOverlay />
    </>
  );
}
