import { useLocalSearchParams } from 'expo-router';

import { UniversitiesScreen } from '@/features/universities/view/universities-screen';

export default function UniversitiesRoute() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  return <UniversitiesScreen initialQuery={typeof q === 'string' ? q : ''} />;
}
