/**
 * PostHog Analytics Native Provider Stub (*.native.ts)
 */

import { AnalyticsProvider } from './types';
import { UserTraits } from '../types';
import { NotImplementedYet } from '../core/context.native';

class PostHogNativeProvider implements AnalyticsProvider {
  name = 'posthog';

  init() {
    throw new NotImplementedYet('providers/posthog.native -> init');
  }

  logEvent(eventName: string, properties: Record<string, any>) {
    throw new NotImplementedYet('providers/posthog.native -> logEvent');
  }

  setUserId(userId: string) {
    throw new NotImplementedYet('providers/posthog.native -> setUserId');
  }

  setUserProperties(traits: UserTraits) {
    throw new NotImplementedYet('providers/posthog.native -> setUserProperties');
  }

  reset() {
    throw new NotImplementedYet('providers/posthog.native -> reset');
  }
}

export const posthogProvider = new PostHogNativeProvider();
