import { useLocalSearchParams } from 'expo-router';
import type { Metadata } from 'expo-router/server';

import { DestinationsScreen } from '@/features/destinations/view/destinations-screen';

export function generateMetadata(): Metadata {
  return {
    title: 'Visa requirements by destination | WeHive',
    description: 'Do Indian passport holders need a visa? Requirements, eVisa and visa-on-arrival options and typical decision times for every country, checked daily.',
  };
}

export default function DestinationsRoute() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  return <DestinationsScreen initialQuery={typeof q === 'string' ? q : ''} />;
}
