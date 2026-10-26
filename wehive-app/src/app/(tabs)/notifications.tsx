import type { Metadata } from 'expo-router/server';

import { NotificationsScreen } from '@/features/notifications/view/notifications-screen';

export function generateMetadata(): Metadata {
  return { title: 'Notifications | WeHive', description: 'Your application updates and alerts.' };
}

export default NotificationsScreen;
