import type { Metadata } from 'expo-router/server';

import { NewsScreen } from '@/features/news/view/news-screen';

export function generateMetadata(): Metadata {
  return {
    title: 'Visa & travel news | WeHive',
    description: 'Latest visa rule changes, embassy announcements and travel updates from official and trusted sources.',
  };
}

export default NewsScreen;
