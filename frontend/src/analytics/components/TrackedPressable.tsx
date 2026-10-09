/**
 * TrackedPressable Component
 */

import React from 'react';
import { Trackable } from './Trackable';

interface TrackedPressableProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  analyticsId: string;
  label?: string;
  analyticsProps?: Record<string, any>;
  impression?: boolean;
  children: React.ReactNode;
}

export function TrackedPressable({
  analyticsId,
  label,
  analyticsProps,
  impression,
  children,
  onClick,
  disabled,
  className,
  ...rest
}: TrackedPressableProps) {
  return (
    <Trackable
      id={analyticsId}
      label={label}
      props={analyticsProps}
      impression={impression}
      disabled={disabled}
      onPress={onClick}
    >
      <button disabled={disabled} className={className} {...rest}>
        {children}
      </button>
    </Trackable>
  );
}
