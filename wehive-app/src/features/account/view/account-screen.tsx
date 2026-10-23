import { Crown, LogOut, Mail, Phone, UserRound } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { useSession } from '@/core/auth/session';
import { spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';
import { AnimatedIcon } from '@/core/ui/animated-icon';
import { Button } from '@/core/ui/button';
import { Card } from '@/core/ui/card';
import { Chip } from '@/core/ui/chip';
import { GradientHero } from '@/core/ui/gradient-hero';
import { Screen } from '@/core/ui/screen';
import { Loading } from '@/core/ui/states';
import { Text } from '@/core/ui/text';
import { SignInForm } from '@/features/auth/view/sign-in-form';

export function AccountScreen() {
  const { user, ready, signOut, refresh } = useSession();
  const { c } = useTheme();
  if (!ready) return <Screen><Loading /></Screen>;

  return (
    <Screen
      onRefresh={user ? refresh : undefined}
      header={
        <GradientHero compact>
          <Text variant="title" style={styles.white}>{user ? `Hi${user.name ? `, ${user.name.split(' ')[0]}` : ''}` : 'Your account'}</Text>
          <Text style={styles.whiteMuted}>{user ? 'Your applications, documents and plan.' : 'Sign in to track applications, slots and documents.'}</Text>
        </GradientHero>
      }>
      {!user ? <SignInForm /> : (
        <>
          <Card>
            <View style={styles.row}>
              <AnimatedIcon icon={UserRound} color={c.primary} active />
              <Text variant="heading">{user.name || 'WeHive member'}</Text>
            </View>
            {user.email ? <Line icon={Mail} text={user.email} verified={user.email_verified} /> : null}
            {user.phone ? <Line icon={Phone} text={user.phone} verified={user.phone_verified} /> : null}
            {user.pending_email ? <Chip label={`Confirm ${user.pending_email} on the website`} tone="warning" /> : null}
          </Card>
          <Card>
            <View style={styles.row}>
              <AnimatedIcon icon={Crown} color={user.is_premium ? c.accent : c.textMuted} active={!!user.is_premium} />
              <Text variant="heading">{user.is_premium ? 'Premium' : 'Free plan'}</Text>
            </View>
            {!user.is_premium ? (
              <Text tone="muted">{user.premium_free_left ?? 0} free AI scans left. Premium unlocks unlimited AI tools.</Text>
            ) : <Text tone="muted">All AI tools unlocked.</Text>}
          </Card>
          <Button label="Sign out" icon={LogOut} variant="outline" onPress={signOut} />
        </>
      )}
    </Screen>
  );
}

function Line({ icon, text, verified }: { icon: typeof Mail; text: string; verified?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={styles.row}>
      <AnimatedIcon icon={icon} size={16} color={c.textMuted} motion="none" />
      <Text style={{ flex: 1 }}>{text}</Text>
      <Chip label={verified ? 'Verified' : 'Not verified'} tone={verified ? 'success' : 'neutral'} />
    </View>
  );
}

const styles = StyleSheet.create({
  white: { color: '#FFFFFF' },
  whiteMuted: { color: 'rgba(255,255,255,0.85)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
