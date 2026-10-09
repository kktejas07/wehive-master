/**
 * Native Device & Envelope Context Provider Stub (*.native.ts)
 * Throw NotImplementedYet in Phase 1 for native platform code split.
 */

import { PropertyEnvelope } from '../types';

export class NotImplementedYet extends Error {
  constructor(moduleName: string) {
    super(`[Analytics Platform Split] ${moduleName} is not implemented for Native in Phase 1.`);
    this.name = 'NotImplementedYet';
  }
}

export function getSessionId(): string {
  throw new NotImplementedYet('context.native -> getSessionId');
}

export function setScreenContext(screenName: string, path?: string): void {
  throw new NotImplementedYet('context.native -> setScreenContext');
}

export function getScreenContext(): { screen: string; previousScreen: string; screenPath: string } {
  throw new NotImplementedYet('context.native -> getScreenContext');
}

export function getStandardEnvelope(): PropertyEnvelope {
  throw new NotImplementedYet('context.native -> getStandardEnvelope');
}
