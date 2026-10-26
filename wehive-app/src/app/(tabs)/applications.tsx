import type { Metadata } from 'expo-router/server';

import { ApplicationsScreen } from '@/features/applications/view/applications-screen';

export function generateMetadata(): Metadata {
  return {
    title: 'Applications | WeHive',
    description: 'Track your visa and study applications.',
  };
}

export default ApplicationsScreen;
