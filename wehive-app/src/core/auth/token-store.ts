import * as SecureStore from 'expo-secure-store';

const KEY = 'wehive_token';

/** Native: the session token lives in the iOS Keychain / Android Keystore. */
export const tokenStore = {
  get: () => SecureStore.getItemAsync(KEY),
  set: (token: string) => SecureStore.setItemAsync(KEY, token),
  clear: () => SecureStore.deleteItemAsync(KEY),
};
