import { Check, Circle } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';
import { GradientHero } from '@/core/ui/gradient-hero';
import { PressableScale } from '@/core/ui/pressable-scale';
import { Screen } from '@/core/ui/screen';
import { Text } from '@/core/ui/text';

interface ChecklistGroup {
  group: string;
  items: string[];
}

const CHECKLIST_GROUPS: ChecklistGroup[] = [
  {
    group: 'Documents & Travel',
    items: [
      'Passport validity checked (min 6 months beyond stay)',
      'Visa stamp / e-visa downloaded and printed',
      'Travel insurance purchased',
      'Accommodation booked for first week',
      'Flight tickets confirmed',
      'International driving permit (if driving)',
    ],
  },
  {
    group: 'Money & Banking',
    items: [
      'Zero-forex credit / debit card obtained',
      'Forex / currency exchanged for first few days',
      'Informed home bank about travel dates',
      'Emergency cash reserve set aside',
    ],
  },
  {
    group: 'Health & Safety',
    items: [
      'Required vaccinations completed',
      'Travel health insurance covers medical emergencies',
      'Emergency contacts saved offline',
      'Country-specific emergency numbers noted',
    ],
  },
  {
    group: 'Communication',
    items: [
      'International SIM or eSIM activated',
      'Local WhatsApp / calling apps downloaded',
      'Hotel / host notified of arrival time',
    ],
  },
];

const STEPS = [
  { title: 'Collect your visa', body: 'Pick up your stamped passport or download the e-visa grant letter.' },
  { title: 'Book flights', body: 'Compare prices early -- flexible dates save money.' },
  { title: 'Arrange accommodation', body: 'Confirm university housing or sign a private lease.' },
  { title: 'Open a bank account', body: 'Many banks offer student accounts you can set up before arrival.' },
  { title: 'Register with your embassy', body: 'Some countries require you to register within 7 days of arrival.' },
  { title: 'Attend orientation', body: 'Enrolment, ID cards and timetable happen here.' },
  { title: 'Get a local SIM', body: 'Airports usually have kiosks; compare data plans before buying.' },
  { title: 'Explore your city', body: 'Find the supermarket, pharmacy and transport near your accommodation.' },
];

export function PostApprovalScreen() {
  const { c } = useTheme();
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const allItems = CHECKLIST_GROUPS.flatMap((g) => g.items);
  const total = allItems.length;
  const done = checked.size;

  const toggle = useCallback((item: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item); else next.add(item);
      return next;
    });
  }, []);

  return (
    <Screen
      header={
        <GradientHero compact>
          <Text variant="title" style={styles.white}>After Visa Approval</Text>
          <Text style={styles.whiteMuted}>
            {done}/{total} checked -- your next steps once the visa lands.
          </Text>
        </GradientHero>
      }>

      {/* Next steps guide */}
      <View style={styles.section}>
        <Text variant="heading">Your roadmap</Text>
        {STEPS.map((s, i) => (
          <View key={i} style={[styles.stepCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={[styles.stepNumber, { backgroundColor: c.infoBg }]}>
              <Text variant="bodyStrong" tone="primary">{i + 1}</Text>
            </View>
            <View style={styles.stepBody}>
              <Text variant="bodyStrong">{s.title}</Text>
              <Text variant="small" tone="muted">{s.body}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Checklist */}
      <View style={styles.section}>
        <Text variant="heading">Travel-ready checklist</Text>
        {CHECKLIST_GROUPS.map((group) => (
          <View key={group.group} style={styles.group}>
            <Text variant="label" tone="muted">{group.group.toUpperCase()}</Text>
            {group.items.map((item) => {
              const isDone = checked.has(item);
              return (
                <PressableScale
                  key={item}
                  onPress={() => toggle(item)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isDone }}
                  style={[styles.checkItem, { backgroundColor: isDone ? c.successBg : c.surface, borderColor: isDone ? c.success : c.border }]}>
                  {isDone ? <Check size={18} color={c.success} /> : <Circle size={18} color={c.textMuted} />}
                  <Text variant="body" style={[{ flex: 1 }, isDone && { textDecorationLine: 'line-through', opacity: 0.6 }]}>{item}</Text>
                </PressableScale>
              );
            })}
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  white: { color: '#FFFFFF' },
  whiteMuted: { color: 'rgba(255,255,255,0.82)' },
  section: { gap: spacing.sm },
  group: { gap: spacing.xs },
  stepCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    borderWidth: 1, borderRadius: radius.lg, padding: spacing.md,
  },
  stepNumber: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepBody: { flex: 1, gap: spacing.xxs },
  checkItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderWidth: 1, borderRadius: radius.md, padding: spacing.md,
  },
});
