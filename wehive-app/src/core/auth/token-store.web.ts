const KEY = 'wehive_token';

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Web: same key the existing website uses for its session. */
export const tokenStore = {
  get: async () => storage()?.getItem(KEY) ?? null,
  set: async (token: string) => storage()?.setItem(KEY, token),
  clear: async () => storage()?.removeItem(KEY),
};
