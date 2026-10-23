import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { CalendarClock, ClipboardCheck, ExternalLink, FileText, ShieldAlert } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';
import { AnimatedIcon } from '@/core/ui/animated-icon';
import { Button } from '@/core/ui/button';
import { Card } from '@/core/ui/card';
import { Chip } from '@/core/ui/chip';
import { GradientHero } from '@/core/ui/gradient-hero';
import { Screen } from '@/core/ui/screen';
import { ErrorState, Loading } from '@/core/ui/states';
import { Text } from '@/core/ui/text';
import { useCountry } from '@/features/destinations/viewmodel/use-country';

export function CountryScreen({ id }: { id: string }) {
  const { view: v, loading, error, refresh } = useCountry(id);
  const { c } = useTheme();
  if (loading) return <Screen><Loading /></Screen>;
  if (error || !v) return <Screen><ErrorState message={error ?? 'Destination not found.'} onRetry={refresh} /></Screen>;

  return (
    <Screen
      header={
        <GradientHero compact>
          <Text style={styles.flag}>{v.flag}</Text>
          <Text variant="title" style={styles.white}>{v.name}</Text>
          <Chip label={v.badge.label} tone={v.badge.tone} />
          <Text style={styles.whiteMuted}>{v.requirementLabel} for Indian passport holders.</Text>
        </GradientHero>
      }>
      {v.restricted ? (
        <Card>
          <AnimatedIcon icon={ShieldAlert} color={c.danger} motion="wiggle" trigger={v.name} />
          <Text variant="heading">Entry restricted</Text>
          <Text tone="muted">Contact WeHive before planning travel to {v.name}.</Text>
        </Card>
      ) : null}

      {v.note ? <Card style={{ backgroundColor: c.surfaceAlt }}><Text>{v.note}</Text></Card> : null}

      {v.time ? (
        <Card>
          <View style={styles.cardHead}>
            <AnimatedIcon icon={CalendarClock} color={c.primary} active />
            <Text variant="label" tone="muted">{v.time.basis}</Text>
          </View>
          <Text variant="heading">{v.time.isAppointment ? 'Interview wait' : 'How long it usually takes'}</Text>
          <Text variant="title" tone="primary">{v.time.label}</Text>
          <Text tone="muted">Apply today: {v.time.window}</Text>
          <Text variant="small" tone="muted">Not a guarantee: the embassy decides, and busy seasons take longer.</Text>
          {v.time.source ? (
            <Button
              variant="ghost"
              icon={ExternalLink}
              label={`${v.time.source.name}${v.time.source.updated ? ` · ${v.time.source.updated}` : ''}`}
              onPress={() => WebBrowser.openBrowserAsync(v.time!.source!.url)}
            />
          ) : null}
        </Card>
      ) : v.onArrival ? (
        <Card>
          <Text variant="heading">Visa on arrival</Text>
          <Text tone="muted">No advance application: the visa is issued when you land in {v.name}.</Text>
        </Card>
      ) : null}

      {v.rules.length ? (
        <View style={styles.section}>
          <View style={styles.cardHead}>
            <AnimatedIcon icon={ClipboardCheck} color={c.primary} active />
            <Text variant="heading">Rules to follow</Text>
          </View>
          {v.rules.map((r, i) => (
            <Card key={i} style={styles.rule}>
              <Chip label={r.badge.label} tone={r.badge.tone} />
              <Text>{r.text}</Text>
            </Card>
          ))}
          <Text variant="small" tone="muted">Checked automatically every day. WeHive confirms the rules before you apply.</Text>
        </View>
      ) : null}

      {v.visaTypes.length ? (
        <View style={styles.section}>
          <View style={styles.cardHead}>
            <AnimatedIcon icon={FileText} color={c.primary} active />
            <Text variant="heading">Visa types</Text>
          </View>
          {v.visaTypes.map((t) => (
            <Card key={t.type}>
              <Text variant="label" tone="muted">{t.type}</Text>
              <Text variant="heading">{t.name}</Text>
              <Text tone="muted">
                {[t.fee ? `Embassy fee ${t.fee}` : null, t.validity ? `Valid ${t.validity.toLowerCase()}` : null].filter(Boolean).join(' · ')}
              </Text>
              {t.documents.map((d) => <Text key={d} variant="small">• {d}</Text>)}
            </Card>
          ))}
          {v.feeNote ? <Text variant="small" tone="muted">{v.feeNote}</Text> : null}
        </View>
      ) : null}

      {!v.restricted ? (
        <Button label="Start my application" variant="accent" full onPress={() => router.push('/account')} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flag: { fontSize: 44, lineHeight: 52 },
  white: { color: '#FFFFFF' },
  whiteMuted: { color: 'rgba(255,255,255,0.85)' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  section: { gap: spacing.sm },
  rule: { gap: spacing.xs },
});
