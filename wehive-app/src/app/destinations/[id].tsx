import { Stack, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';

import { useCountry } from '@/features/destinations/viewmodel/use-country';
import { CountryScreen } from '@/features/destinations/view/country-screen';

export default function CountryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { view } = useCountry(id ?? '');
  const title = view ? `${view.name} visa for Indian citizens | WeHive` : 'Destination | WeHive';
  return (
    <>
      <Stack.Screen options={{ title: view?.name ?? 'Destination' }} />
      <Head>
        <title>{title}</title>
        {view ? <meta name="description" content={`${view.requirementLabel}. ${view.time ? `Usually ${view.time.label}. ` : ''}Rules to follow, fees and documents.`} /> : null}
      </Head>
      <CountryScreen id={id ?? ''} />
    </>
  );
}
