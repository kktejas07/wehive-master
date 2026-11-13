import { ChevronRight, Globe, Search } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { radius, spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';
import { Chip } from '@/core/ui/chip';
import { GradientHero } from '@/core/ui/gradient-hero';
import { PressableScale } from '@/core/ui/pressable-scale';
import { Screen } from '@/core/ui/screen';
import { EmptyState, ErrorState, SkeletonRows } from '@/core/ui/states';
import { Text } from '@/core/ui/text';
import { TextField } from '@/core/ui/text-field';
import { useVisaChecker } from '../viewmodel/use-visa-checker';
import type { VisaRequirement } from '../model/types';

function toneFor(req: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (req === 'visa_free' || req === 'on_arrival') return 'success';
  if (req === 'evisa' || req === 'evisa_or_on_arrival') return 'warning';
  if (req === 'restricted') return 'danger';
  return 'neutral';
}

export function VisaCheckerScreen() {
  const vm = useVisaChecker();
  const { c } = useTheme();

  return (
    <Screen
      refreshing={vm.refreshing}
      onRefresh={vm.refresh}
      header={
        <GradientHero compact>
          <Text variant="title" style={styles.white}>Visa Checker</Text>
          <Text style={styles.whiteMuted}>Check visa requirements for Indian passport holders.</Text>
        </GradientHero>
      }>
      <TextField
        label="Search"
        placeholder="Country name"
        value={vm.query}
        onChangeText={vm.setQuery}
        autoCorrect={false}
        returnKeyType="search"
        testID="visa-search"
      />

      {vm.loading ? <SkeletonRows count={8} /> : vm.error ? (
        <ErrorState message={vm.error} onRetry={vm.refresh} />
      ) : vm.items.length === 0 ? (
        <EmptyState title="No results" body="Try a different country name." />
      ) : (
        <View style={styles.list}>
          {vm.items.map((row, i) => <RequirementRow key={row.country} item={row} index={i} />)}
        </View>
      )}
      {!vm.loading && !vm.error ? (
        <Text variant="small" tone="muted">
          <Search size={12} color={c.textMuted} /> {vm.items.length} countries
        </Text>
      ) : null}
    </Screen>
  );
}

function RequirementRow({ item, index }: { item: VisaRequirement; index: number }) {
  const { c } = useTheme();
  const reduce = useReducedMotion();

  return (
    <Animated.View entering={reduce || index > 12 ? undefined : FadeInDown.delay(index * 25).duration(240)}>
      <PressableScale
        accessibilityRole="link"
        accessibilityLabel={`${item.country}, ${item.requirement_label}`}
        style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={styles.flag}>{item.flag ?? '🌍'}</Text>
        <View style={styles.rowBody}>
          <Text variant="heading" numberOfLines={1}>{item.country}</Text>
          <View style={styles.rowMeta}>
            <Chip label={item.requirement_label} tone={toneFor(item.requirement)} />
            {item.processing_days ? (
              <Text variant="small" tone="muted">~{item.processing_days} days</Text>
            ) : null}
          </View>
          {item.note ? <Text variant="small" tone="muted" numberOfLines={2}>{item.note}</Text> : null}
        </View>
        <ChevronRight size={18} color={c.textMuted} />
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  white: { color: '#FFFFFF' },
  whiteMuted: { color: 'rgba(255,255,255,0.82)' },
  list: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  flag: { fontSize: 30, lineHeight: 36 },
  rowBody: { flex: 1, minWidth: 0, gap: spacing.xs },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
});
