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
            <Stack.Screen name="universities" options={{ title: 'Universities', headerBackTitle: 'Back' }} />
            <Stack.Screen name="university/[id]" options={{ title: 'University', headerBackTitle: 'Back' }} />
            <Stack.Screen name="blog" options={{ title: 'Blog', headerBackTitle: 'Back' }} />
            <Stack.Screen name="events" options={{ title: 'Events', headerBackTitle: 'Back' }} />
            <Stack.Screen name="community" options={{ title: 'Community', headerBackTitle: 'Back' }} />
            <Stack.Screen name="visa-checker/index" options={{ title: 'Visa Checker', headerBackTitle: 'Back' }} />
            <Stack.Screen name="sop-builder/index" options={{ title: 'SOP Builder', headerBackTitle: 'Back' }} />
            <Stack.Screen name="sop-builder/[id]" options={{ title: 'SOP Template', headerBackTitle: 'Back' }} />
            <Stack.Screen name="financial" options={{ title: 'Financial Tools', headerBackTitle: 'Back' }} />
            <Stack.Screen name="resources" options={{ title: 'Resources', headerBackTitle: 'Back' }} />
            <Stack.Screen name="pre-departure" options={{ title: 'Pre-Departure', headerBackTitle: 'Back' }} />
            <Stack.Screen name="post-approval" options={{ title: 'Post-Approval', headerBackTitle: 'Back' }} />
            <Stack.Screen name="visa-interview" options={{ title: 'Visa Interview', headerBackTitle: 'Back' }} />
            <Stack.Screen name="about" options={{ title: 'About', headerBackTitle: 'Back' }} />
            <Stack.Screen name="contact" options={{ title: 'Contact', headerBackTitle: 'Back' }} />
            <Stack.Screen name="help" options={{ title: 'Help', headerBackTitle: 'Back' }} />
            <Stack.Screen name="pricing" options={{ title: 'Pricing', headerBackTitle: 'Back' }} />
            <Stack.Screen name="visa-scheduling" options={{ title: 'Visa Scheduling', headerBackTitle: 'Back' }} />
            <Stack.Screen name="assessment" options={{ title: 'Exam Prep', headerBackTitle: 'Back' }} />
            <Stack.Screen name="enquiry" options={{ title: 'Enquiry', headerBackTitle: 'Back' }} />
            <Stack.Screen name="emergency" options={{ title: 'Emergency', headerBackTitle: 'Back' }} />
            <Stack.Screen name="free-consultation" options={{ title: 'Free Consultation', headerBackTitle: 'Back' }} />
            <Stack.Screen name="intake-calendar" options={{ title: 'Intake Calendar', headerBackTitle: 'Back' }} />
            <Stack.Screen name="student-visa" options={{ title: 'Student Visa', headerBackTitle: 'Back' }} />
            <Stack.Screen name="track/[id]" options={{ title: 'Application', headerBackTitle: 'Track' }} />
          </Stack>
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
