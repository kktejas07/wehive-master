/**
 * Manual Press Tracking Hook
 */

import { useCallback } from 'react';
import { dispatcher } from '../core/dispatcher';
import { EVENTS } from '../constants/events';

export function useTrackedPress() {
  const trackPress = useCallback((id: string, label?: string, props: Record<string, any> = {}) => {
    dispatcher.dispatch(EVENTS.ELEMENT_CLICK, {
      element_id: id,
      element_label: label,
      ...props,
    });
  }, []);

  return trackPress;
}
