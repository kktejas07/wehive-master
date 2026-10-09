/**
 * Multi-Step Funnel Flow Tracking Hook
 */

import { useCallback } from 'react';
import { dispatcher } from '../core/dispatcher';
import { EVENTS } from '../constants/events';

export function useFlow(flowId: string) {
  const trackFlowStep = useCallback(
    (stepIndex: number, stepName: string, status: 'start' | 'complete' | 'skipped' | 'failed' = 'complete', extraProps: Record<string, any> = {}) => {
      dispatcher.dispatch(EVENTS.FLOW_STEP, {
        flow_id: flowId,
        step_index: stepIndex,
        step_name: stepName,
        step_status: status,
        ...extraProps,
      });
    },
    [flowId]
  );

  return { trackFlowStep };
}
