import { AlertTriangle, Check, ChevronDown, ChevronUp, Phone, X } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';
import { Button } from '@/core/ui/button';
import { Card } from '@/core/ui/card';
import { GradientHero } from '@/core/ui/gradient-hero';
import { PressableScale } from '@/core/ui/pressable-scale';
import { Screen } from '@/core/ui/screen';
import { Text } from '@/core/ui/text';
import { COVERED_SITUATIONS, EMERGENCY_FAQS, EMERGENCY_STATS, NOT_COVERED_SITUATIONS } from '../model/types';
import { useEmergency } from '../viewmodel/use-emergency';

export function EmergencyScreen() {
  const { c } = useTheme();
  const vm = useEmergency();

  return (
    <Screen
      header={
        <GradientHero>
          <View style={styles.badge}>
            <AlertTriangle size={14} color="#FFC531" />
            <Text variant="small" style={{ color: 'rgba(255,255,255,0.8)' }}>Emergency Support</Text>
          </View>
          <Text variant="hero" style={styles.white}>{"Emergency visa?\nWe're on it"}</Text>
          <Text style={styles.whiteMuted}>
            {"Crisis doesn't wait for paperwork. Talk to a visa specialist now and get your application moving."}
          </Text>
        </GradientHero>
      }>

      {/* CTA buttons */}
      <Button label="Get emergency visa help" icon={Phone} variant="accent" onPress={vm.callHelpline} full />
      <Button label={vm.phoneDisplay} variant="outline" onPress={vm.callHelpline} full />

      {/* Stats */}
      <View style={styles.statsRow}>
        {EMERGENCY_STATS.map((s) => (
          <View key={s.label} style={[styles.statCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text variant="heading" tone="primary">{s.value}</Text>
            <Text variant="small" tone="muted">{s.label}</Text>
          </View>
        ))}
      </View>

      {/* What we cover */}
      <View style={styles.section}>
        <Text variant="heading">What we cover</Text>
        {COVERED_SITUATIONS.map((item) => (
          <View key={item.title} style={[styles.serviceRow, { backgroundColor: c.successBg, borderColor: c.success }]}>
            <Check size={18} color={c.success} />
            <View style={styles.serviceBody}>
              <Text variant="bodyStrong">{item.title}</Text>
              <Text variant="small" tone="muted">{item.description}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* What's not covered */}
      <View style={styles.section}>
        <Text variant="heading">Not covered</Text>
        {NOT_COVERED_SITUATIONS.map((item) => (
          <View key={item.title} style={[styles.serviceRow, { backgroundColor: c.dangerBg, borderColor: c.danger }]}>
            <X size={18} color={c.danger} />
            <View style={styles.serviceBody}>
              <Text variant="bodyStrong">{item.title}</Text>
              <Text variant="small" tone="muted">{item.description}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* FAQ */}
      <View style={styles.section}>
        <Text variant="heading">Frequently Asked Questions</Text>
        {EMERGENCY_FAQS.map((faq, i) => {
          const open = vm.expandedFaq === i;
          return (
            <PressableScale key={i} onPress={() => vm.toggleFaq(i)} style={[styles.faqItem, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={styles.faqHeader}>
                <Text variant="bodyStrong" style={{ flex: 1 }}>{faq.question}</Text>
                {open ? <ChevronUp size={18} color={c.textMuted} /> : <ChevronDown size={18} color={c.textMuted} />}
              </View>
              {open && <Text variant="small" tone="muted">{faq.answer}</Text>}
            </PressableScale>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  white: { color: '#FFFFFF' },
  whiteMuted: { color: 'rgba(255,255,255,0.82)' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, opacity: 0.9 },
  section: { gap: spacing.sm },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: { flex: 1, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', gap: spacing.xxs },
  serviceRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    borderWidth: 1, borderRadius: radius.md, padding: spacing.md,
  },
  serviceBody: { flex: 1, gap: spacing.xxs },
  faqItem: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  faqHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
