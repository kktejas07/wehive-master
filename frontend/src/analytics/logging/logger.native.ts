/**
 * Logger Native Transport Stub (*.native.ts)
 */

import { NotImplementedYet } from '../core/context.native';

class NativeLogger {
  info() { throw new NotImplementedYet('logger.native -> info'); }
  debug() { throw new NotImplementedYet('logger.native -> debug'); }
  warn() { throw new NotImplementedYet('logger.native -> warn'); }
  error() { throw new NotImplementedYet('logger.native -> error'); }
}

export const logger = new NativeLogger();
