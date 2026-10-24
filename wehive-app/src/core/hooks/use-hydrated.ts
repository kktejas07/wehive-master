import { useSyncExternalStore } from 'react';

const noop = () => () => {};

/** False while rendering static HTML and during hydration, true afterwards (no effect, no extra state). */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}
