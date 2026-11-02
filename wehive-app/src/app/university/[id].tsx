import { Stack, useLocalSearchParams } from 'expo-router';

import { useUniversityDetail } from '@/features/universities/viewmodel/use-university-detail';
import { UniversityDetailScreen } from '@/features/universities/view/university-detail-screen';

export default function UniversityRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { view } = useUniversityDetail(id ?? '');
  return (
    <>
      <Stack.Screen options={{ title: view?.name ?? 'University' }} />
      <UniversityDetailScreen id={id ?? ''} />
    </>
  );
}
