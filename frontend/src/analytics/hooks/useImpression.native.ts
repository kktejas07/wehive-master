/**
 * Element Impression Hook Stub (*.native.ts)
 */

import { useRef } from 'react';
import { NotImplementedYet } from '../core/context.native';

export function useImpression(id: string, options?: any) {
  const ref = useRef(null);
  // Throw inside hook execution if invoked on native in Phase 1
  if (process.env.NODE_ENV !== 'test') {
    throw new NotImplementedYet('useImpression.native -> useImpression');
  }
  return ref;
}
