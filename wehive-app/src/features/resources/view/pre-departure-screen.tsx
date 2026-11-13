import { Check, Circle } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';
import { GradientHero } from '@/core/ui/gradient-hero';
import { PressableScale } from '@/core/ui/pressable-scale';
import { Screen } from '@/core/ui/screen';
import { Text } from '@/core/ui/text';

interface Phase {
  title: string;
  items: { id: string; text: string; critical?: boolean }[];
}

const PHASES: Phase[] = [
  {
    title: 'Visa Approved',
    items: [
      { id: 'v1', text: 'Collect visa / download e-visa', critical: true },
      { id: 'v2', text: 'Verify visa sticker details (name, dates, type)' },
      { id: 'v3', text: 'Make 2 photocopies of visa + passport bio page' },
      { id: 'v4', text: 'Scan and store copies in cloud' },
      { id: 'v5', text: 'Share visa copy with parents or emergency contact' },
    ],
  },
  {
    title: 'Travel & Booking',
    items: [
      { id: 't1', text: 'Book one-way or return flights', critical: true },
      { id: 't2', text: 'Confirm baggage allowance (usually 2 x 23 kg for students)' },
      { id: 't3', text: 'Book airport pickup / transfer' },
      { id: 't4', text: 'Reserve temporary accommodation for first 1-2 weeks' },
      { id: 't5', text: 'Apply for on-campus or off-campus housing', critical: true },
      { id: 't6', text: 'Purchase travel insurance covering first 90 days' },
    ],
  },
  {
    title: 'Finances & Banking',
    items: [
      { id: 'f1', text: 'Open forex card (Niyo / BookMyForex / Wise)', critical: true },
      { id: 'f2', text: 'Transfer tuition fee deposit to university' },
      { id: 'f3', text: 'Carry emergency cash ($200-500 in local currency)' },
      { id: 'f4', text: 'Inform your Indian bank about international travel' },
      { id: 'f5', text: 'Download mobile banking apps (Revolut, Wise)' },
      { id: 'f6', text: 'Check education loan disbursement schedule' },
    ],
  },
  {
    title: 'Health & Insurance',
    items: [
      { id: 'h1', text: 'Get required vaccinations', critical: true },
      { id: 'h2', text: 'Collect medical records and prescriptions' },
      { id: 'h3', text: 'Stock 3-month supply of regular medications' },
      { id: 'h4', text: 'Carry prescription letter from doctor (in English)' },
      { id: 'h5', text: 'Enrol in university health insurance' },
      { id: 'h6', text: 'Get dental and eye check-up before departure' },
    ],
  },
  {
    title: 'Documents',
    items: [
      { id: 'd1', text: 'University admission letter (original + copies)', critical: true },
      { id: 'd2', text: 'I-20 / CAS / CoE / admission confirmation', critical: true },
      { id: 'd3', text: 'SEVIS fee receipt (US) / IHS payment (UK)' },
      { id: 'd4', text: 'Academic transcripts (original, sealed envelope)' },
      { id: 'd5', text: 'Passport-size photos (20 copies)' },
      { id: 'd6', text: 'SIM card / eSIM activated for destination' },
    ],
  },
];

export function PreDepartureScreen() {
  const { c } = useTheme();
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const total = PHASES.reduce((n, p) => n + p.items.length, 0);
  const done = checked.size;

  return (
    <Screen
      header={
        <GradientHero compact>
          <Text variant="title" style={styles.white}>Pre-Departure Checklist</Text>
          <Text style={styles.whiteMuted}>
            {done}/{total} completed -- everything to check before you fly.
          </Text>
        </GradientHero>
      }>
      {PHASES.map((phase) => (
        <View key={phase.title} style={styles.phase}>
          <Text variant="heading">{phase.title}</Text>
          {phase.items.map((item) => {
            const isDone = checked.has(item.id);
            return (
              <PressableScale
                key={item.id}
                onPress={() => toggle(item.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isDone }}
                style={[styles.item, { backgroundColor: isDone ? c.successBg : c.surface, borderColor: isDone ? c.success : c.border }]}>
                {isDone ? <Check size={18} color={c.success} /> : <Circle size={18} color={c.textMuted} />}
                <View style={styles.itemBody}>
                  <Text variant="body" style={isDone ? { textDecorationLine: 'line-through', opacity: 0.6 } : undefined}>{item.text}</Text>
                  {item.critical && !isDone && <Text variant="small" tone="danger">Important</Text>}
                </View>
              </PressableScale>
            );
          })}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  white: { color: '#FFFFFF' },
  whiteMuted: { color: 'rgba(255,255,255,0.82)' },
  phase: { gap: spacing.sm },
  item: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    borderWidth: 1, borderRadius: radius.md, padding: spacing.md,
  },
  itemBody: { flex: 1, gap: spacing.xxs },
});
