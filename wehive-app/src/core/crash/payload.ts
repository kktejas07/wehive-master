/** Body accepted by the backend crash intake, `POST /api/client-errors`. */
export type CrashReport = {
  message: string;
  name: string;
  stack: string;
  platform: 'web' | 'ios' | 'android' | 'unknown';
  app_version: string;
  screen: string;
  fatal: boolean;
};

const PLATFORMS = ['web', 'ios', 'android'] as const;

/** Turn anything thrown into a report that fits the server's length caps. */
export function buildCrashReport(
  error: unknown,
  ctx: { platform?: string; appVersion?: string; screen?: string; fatal?: boolean } = {},
): CrashReport {
  const err =
    error instanceof Error
      ? error
      : new Error(error == null ? 'Unknown error' : typeof error === 'string' ? error : safeStringify(error));
  const platform = PLATFORMS.find((p) => p === ctx.platform) ?? 'unknown';
  return {
    message: (err.message || 'Unknown error').slice(0, 2000),
    name: (err.name || 'Error').slice(0, 200),
    stack: (err.stack ?? '').slice(0, 8000),
    platform,
    app_version: (ctx.appVersion ?? '').slice(0, 40),
    screen: (ctx.screen ?? '').slice(0, 300),
    fatal: ctx.fatal ?? false,
  };
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}
