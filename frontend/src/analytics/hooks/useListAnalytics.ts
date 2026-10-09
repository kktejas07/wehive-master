/**
 * List & Scroll Depth Tracking Hook
 */

import { useEffect, useRef } from 'react';
import { dispatcher } from '../core/dispatcher';
import { EVENTS } from '../constants/events';

export function useListAnalytics(listId: string) {
  const trackedDepths = useRef(new Set<number>());

  useEffect(() => {
    const handleScroll = () => {
      const el = document.documentElement;
      const scrollTop = window.scrollY || el.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      if (scrollHeight <= 0) return;

      const pct = Math.round((scrollTop / scrollHeight) * 100);
      const thresholds = [25, 50, 75, 100];

      thresholds.forEach(t => {
        if (pct >= t && !trackedDepths.current.has(t)) {
          trackedDepths.current.add(t);
          dispatcher.dispatch(EVENTS.LIST_INTERACTION, {
            list_id: listId,
            scroll_depth_pct: t,
          });
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [listId]);

  return {
    trackFilterChange: (filters: Record<string, any>) => {
      dispatcher.dispatch(EVENTS.LIST_INTERACTION, {
        list_id: listId,
        interaction_type: 'filter_change',
        filters,
      });
    },
  };
}
