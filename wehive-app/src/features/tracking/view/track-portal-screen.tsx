import { router } from 'expo-router';
import { Activity, Bell, Clock, Search, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { palette, radius, spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';
import { Button } from '@/core/ui/button';
import { Card } from '@/core/ui/card';
import { GradientHero } from '@/core/ui/gradient-hero';
import { Screen } from '@/core/ui/screen';
import { Text } from '@/core/ui/text';
import { TextField } from '@/core/ui/text-field';

const STEPS = [
  { icon: ShieldCheck, title: 'Expert document checks', desc: 'Specialists verify your documents against the embassy checklist.' },
  { icon: Activity, title: 'Every step in one place', desc: 'Each milestone appears in your timeline as your case team records it.' },
  { icon: Bell, title: 'Alerts when it changes', desc: 'Get notified by email or push when your application status changes.' },
];

export function TrackPortalScreen() {
  const { c } = useTheme();
  const [appId, setAppId] = useState('');

  const handleSearch = () => {
    const clean = appId.trim().replace('#', '').toLowerCase();
    if (clean) router.push({ pathname: '/track/[id]', params: { id: clean } });
  };

  return (
    <Screen
      header={
        <GradientHero compact>
          <Text variant="title" style={styles.white}>Track Your Application</Text>
          <Text style={styles.whiteMuted}>Enter your WeHive application ID for live status updates.</Text>
        </GradientHero>
      }>

      <TextField
        label="Application ID"
        placeholder="From your confirmation email"
        value={appId}
        onChangeText={setAppId}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        onSubmitEditing={handleSearch}
        testID="track-input"
      />
      <Button label="Track Status" icon={Search} onPress={handleSearch} disabled={!appId.trim()} full testID="track-submit" />

      <Card>
        <Text variant="heading">WeHive Tracking Promise</Text>
        {STEPS.map((s) => {
          const Icon = s.icon;
          return (
            <View key={s.title} style={styles.stepRow}>
              <View style={[styles.stepIcon, { backgroundColor: palette.iceBlue }]}>
                <Icon size={16} color={palette.royalBlue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{s.title}</Text>
                <Text variant="small" tone="muted">{s.desc}</Text>
              </View>
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  white: { color: '#FFFFFF' },
  whiteMuted: { color: 'rgba(255,255,255,0.82)' },
  stepRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', paddingVertical: spacing.sm },
  stepIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
});
