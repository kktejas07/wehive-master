/**
 * IntersectionObserver Element Impression Hook (*.web.ts)
 */

import { useEffect, useRef } from 'react';
import { dispatcher } from '../core/dispatcher';
import { EVENTS } from '../constants/events';

interface ImpressionOptions {
  enabled?: boolean;
  threshold?: number;
  dwellMs?: number;
  props?: Record<string, any>;
}

export function useImpression(
  id: string,
  { enabled = true, threshold = 0.5, dwellMs = 1000, props = {} }: ImpressionOptions = {}
) {
  const elementRef = useRef<HTMLElement | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !id || firedRef.current || typeof window === 'undefined') return;

    let dwellTimer: any = null;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !firedRef.current) {
            dwellTimer = setTimeout(() => {
              if (!firedRef.current) {
                firedRef.current = true;
                dispatcher.dispatch(EVENTS.ELEMENT_IMPRESSION, {
                  element_id: id,
                  dwell_ms: dwellMs,
                  ...props,
                });
              }
            }, dwellMs);
          } else {
            if (dwellTimer) clearTimeout(dwellTimer);
          }
        });
      },
      { threshold }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      observer.disconnect();
      if (dwellTimer) clearTimeout(dwellTimer);
    };
  }, [id, enabled, threshold, dwellMs]);

  return elementRef;
}
