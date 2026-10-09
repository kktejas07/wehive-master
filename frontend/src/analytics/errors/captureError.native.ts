/**
 * Native Exception & Error Tracking Stub (*.native.ts)
 */

import { NotImplementedYet } from '../core/context.native';
import { ErrorContext } from './captureError.web';

export function captureError(error: unknown, context?: ErrorContext): void {
  throw new NotImplementedYet('errors/captureError.native -> captureError');
}
