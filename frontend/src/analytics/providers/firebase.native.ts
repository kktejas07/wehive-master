/**
 * Firebase Analytics Native Provider Stub (*.native.ts)
 */

import { AnalyticsProvider } from './types';
import { UserTraits } from '../types';
import { NotImplementedYet } from '../core/context.native';

class FirebaseNativeProvider implements AnalyticsProvider {
  name = 'firebase';

  init() {
    throw new NotImplementedYet('providers/firebase.native -> init');
  }

  logEvent(eventName: string, properties: Record<string, any>) {
    throw new NotImplementedYet('providers/firebase.native -> logEvent');
  }

  setUserId(userId: string) {
    throw new NotImplementedYet('providers/firebase.native -> setUserId');
  }

  setUserProperties(traits: UserTraits) {
    throw new NotImplementedYet('providers/firebase.native -> setUserProperties');
  }

  reset() {
    throw new NotImplementedYet('providers/firebase.native -> reset');
  }
}

export const firebaseProvider = new FirebaseNativeProvider();
