import type { Metadata } from 'expo-router/server';
import { router } from 'expo-router';
import { FileStack } from 'lucide-react-native';
import { View, StyleSheet } from 'react-native';

import { useSession } from '@/core/auth/session';
import { spacing } from '@/core/theme/tokens';
import { Button } from '@/core/ui/button';
import { GradientHero } from '@/core/ui/gradient-hero';
import { Screen } from '@/core/ui/screen';
import { Loading } from '@/core/ui/states';
import { Text } from '@/core/ui/text';
import { SignInForm } from '@/features/auth/view/sign-in-form';

export function generateMetadata(): Metadata {
  return { title: 'Track | WeHive', description: 'Track the status of your visa and university applications.' };
}

function TrackScreen() {
  const { user, ready } = useSession();
  if (!ready) return <Screen><Loading /></Screen>;

  return (
    <Screen
      header={
        <GradientHero compact>
          <Text variant="title" tone="onPrimary">Track applications</Text>
          <Text variant="body" tone="onPrimary" style={{ opacity: 0.8 }}>
            {user ? 'Your active visa and study applications.' : 'Sign in to see your applications.'}
          </Text>
        </GradientHero>
      }>
      {!user ? (
        <SignInForm />
      ) : (
        <View style={styles.placeholder}>
          <FileStack size={48} color="#5E6690" />
          <Text variant="heading" style={{ textAlign: 'center' }}>Full tracking coming soon</Text>
          <Text variant="body" tone="muted" style={{ textAlign: 'center' }}>
            Manage your applications in detail on the website while we finish the mobile view.
          </Text>
          <Button
            label="Go to Account"
            variant="outline"
            onPress={() => router.push('/account')}
          />
        </View>
      )}
    </Screen>
  );
}

export default TrackScreen;

const styles = StyleSheet.create({
  placeholder: { alignItems: 'center', gap: spacing.lg, paddingTop: spacing.xxxl },
});
