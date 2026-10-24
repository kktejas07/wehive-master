import { Figtree_600SemiBold, Figtree_700Bold, Figtree_800ExtraBold } from '@expo-google-fonts/figtree';
import { NotoSans_400Regular, NotoSans_500Medium } from '@expo-google-fonts/noto-sans';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { SessionProvider } from '@/core/auth/session';
import { fonts } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, fontError] = useFonts({
    Figtree_600SemiBold, Figtree_700Bold, Figtree_800ExtraBold, NotoSans_400Regular, NotoSans_500Medium,
  });
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }));
  const { scheme, c } = useTheme();

  useEffect(() => {
    if (loaded || fontError) SplashScreen.hideAsync();
  }, [loaded, fontError]);

  // Native waits for fonts behind the splash; web renders straight away so static HTML has content.
  if (!loaded && !fontError && Platform.OS !== 'web') return null;

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ThemeProvider value={{ ...base, colors: { ...base.colors, primary: c.primary, background: c.background, card: c.surface, text: c.text, border: c.border } }}>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerTitleStyle: { fontFamily: fonts.heading }, headerTintColor: c.primary }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="destinations/[id]" options={{ title: 'Destination', headerBackTitle: 'Back' }} />
          </Stack>
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
