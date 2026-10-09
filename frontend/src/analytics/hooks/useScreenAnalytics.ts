/**
 * Screen View & Duration Tracking Hook
 */

import { useEffect, useRef } from 'react';
import { dispatcher } from '../core/dispatcher';
import { EVENTS } from '../constants/events';
import { setScreenContext } from '../core/context';

export function useScreenAnalytics(screenName: string, props: Record<string, any> = {}) {
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now();
    setScreenContext(screenName);

    // 1. Dispatch screen_view
    dispatcher.dispatch(EVENTS.SCREEN_VIEW, {
      screen_name: screenName,
      ...props,
    });

    // 2. Track screen exit and duration on unmount
    return () => {
      const durationMs = Date.now() - startTimeRef.current;
      dispatcher.dispatch(EVENTS.SCREEN_EXIT, {
        screen_name: screenName,
        duration_ms: durationMs,
        ...props,
      });
    };
  }, [screenName]);
}
