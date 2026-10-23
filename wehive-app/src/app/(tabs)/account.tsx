import type { Metadata } from 'expo-router/server';

import { AccountScreen } from '@/features/account/view/account-screen';

export function generateMetadata(): Metadata {
  return { title: 'Your account | WeHive', description: 'Sign in to track your visa and university applications.' };
}

export default AccountScreen;
