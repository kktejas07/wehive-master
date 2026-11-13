import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { API_URL } from '@/core/config';
import { buildCrashReport } from '@/core/crash/payload';

type GlobalHandler = (error: unknown, isFatal?: boolean) => void;
type ErrorUtilsLike = { getGlobalHandler(): GlobalHandler; setGlobalHandler(handler: GlobalHandler): void };

/** Send a crash to the backend (`POST /api/client-errors`). Never throws: reporting must not cause a second crash. */
export function reportError(error: unknown, ctx: { fatal?: boolean; screen?: string } = {}): void {
  if (__DEV__) return; // development errors are already on screen and in the console
  const body = buildCrashReport(error, { ...ctx, platform: Platform.OS, appVersion: Constants.expoConfig?.version ?? '' });
  fetch(`${API_URL}/client-errors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {});
}

let installed = false;

/** Report uncaught JS errors on native, then hand over to React Native's own handler. Call once at startup. */
export function installCrashHandler(): void {
  if (installed) return;
  installed = true;
  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  if (!errorUtils) return; // web: render errors still reach the route ErrorBoundary
  const previous = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    reportError(error, { fatal: !!isFatal });
    previous(error, isFatal);
  });
}
