/**
 * Form Analytics Hook
 */

import { useRef, useCallback } from 'react';
import { dispatcher } from '../core/dispatcher';
import { EVENTS } from '../constants/events';

export function useFormAnalytics(formId: string) {
  const startedRef = useRef(false);

  const trackFormStart = useCallback(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      dispatcher.dispatch(EVENTS.FORM_START, { form_id: formId });
    }
  }, [formId]);

  const trackFieldComplete = useCallback((fieldName: string) => {
    dispatcher.dispatch(EVENTS.FORM_FIELD_COMPLETE, {
      form_id: formId,
      field_name: fieldName,
    });
  }, [formId]);

  const trackFormSubmit = useCallback((props: Record<string, any> = {}) => {
    dispatcher.dispatch(EVENTS.FORM_SUBMIT, {
      form_id: formId,
      ...props,
    });
  }, [formId]);

  const trackFormError = useCallback((field: string, errorCode: string) => {
    dispatcher.dispatch(EVENTS.FORM_ERROR, {
      form_id: formId,
      error_field: field,
      error_code: errorCode,
    });
  }, [formId]);

  return {
    trackFormStart,
    trackFieldComplete,
    trackFormSubmit,
    trackFormError,
  };
}
