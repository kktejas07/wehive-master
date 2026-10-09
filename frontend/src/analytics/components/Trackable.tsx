/**
 * Generic Trackable Component Wrapper
 * Intercepts onPress/onClick to fire element_click prior to original handler execution.
 */

import React, { ReactElement, cloneElement } from 'react';
import { dispatcher } from '../core/dispatcher';
import { EVENTS } from '../constants/events';
import { useImpression } from '../hooks/useImpression';

interface TrackableProps {
  id: string;
  label?: string;
  props?: Record<string, any>;
  impression?: boolean;
  disabled?: boolean;
  onPress?: (e?: any) => void;
  children: ReactElement<any>;
}

export function Trackable({
  id,
  label,
  props = {},
  impression = false,
  disabled = false,
  onPress,
  children,
}: TrackableProps) {
  const impressionRef = useImpression(id, { enabled: impression, props });

  const handlePress = (e: any) => {
    // 1. Fire element_click before executing original handler
    dispatcher.dispatch(EVENTS.ELEMENT_CLICK, {
      element_id: id,
      element_label: label || (typeof children.props.children === 'string' ? children.props.children : undefined),
      interaction_blocked: disabled,
      ...props,
    });

    // 2. Call original handler if not disabled
    if (!disabled) {
      if (onPress) onPress(e);
      if (children.props.onPress) children.props.onPress(e);
      if (children.props.onClick) children.props.onClick(e);
    }
  };

  // Clone child with injected attributes & click handler
  return cloneElement(children, {
    ref: impression ? impressionRef : children.props.ref,
    onPress: handlePress,
    onClick: handlePress,
    'data-analytics-id': id,
    'data-attr': id,
    'ph-label': id,
  });
}
