import { router } from 'expo-router';
import { ChevronRight, Search } from 'lucide-react-native';
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
import { useDestinations, type DestinationFilter, type DestinationRow } from '@/features/destinations/viewmodel/use-destinations';

const FILTERS: { key: DestinationFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'easy', label: 'No visa / on arrival' },
  { key: 'evisa', label: 'eVisa' },
  { key: 'visa', label: 'Visa required' },
];

export function DestinationsScreen({ initialQuery = '' }: { initialQuery?: string }) {
  const vm = useDestinations(initialQuery);
  const { c } = useTheme();
  return (
    <Screen
      refreshing={vm.refreshing}
      onRefresh={vm.refresh}
      header={
        <GradientHero compact>
          <Text variant="title" style={styles.white}>Destinations</Text>
          <Text style={styles.whiteMuted}>Visa rules for Indian passport holders, checked every day.</Text>
        </GradientHero>
      }>
      <TextField
        label="Search"
        placeholder="Country name"
        value={vm.query}
        onChangeText={vm.setQuery}
        autoCorrect={false}
        returnKeyType="search"
        testID="destinations-search"
      />
      <View style={styles.filters} accessibilityRole="tablist">
        {FILTERS.map((f) => {
          const on = vm.filter === f.key;
          return (
            <PressableScale
              key={f.key}
              onPress={() => vm.setFilter(f.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={[styles.filter, { backgroundColor: on ? c.primary : c.surface, borderColor: on ? c.primary : c.border }]}>
              <Text variant="small" style={{ color: on ? c.onPrimary : c.text, fontFamily: 'Figtree_600SemiBold' }}>{f.label}</Text>
            </PressableScale>
          );
        })}
      </View>

      {vm.loading ? <SkeletonRows count={6} /> : vm.error ? (
        <ErrorState message={vm.error} onRetry={vm.refresh} />
      ) : vm.items.length === 0 ? (
        <EmptyState title="No destinations match" body="Try another name or filter." />
      ) : (
        <View style={styles.list}>
          {vm.items.map((row, i) => <Row key={row.id} row={row} index={i} />)}
        </View>
      )}
      {!vm.loading && !vm.error ? (
        <Text variant="small" tone="muted">
          <Search size={12} color={c.textMuted} /> {vm.items.length} destinations
        </Text>
      ) : null}
    </Screen>
  );
}

function Row({ row, index }: { row: DestinationRow; index: number }) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  return (
    <Animated.View entering={reduce || index > 12 ? undefined : FadeInDown.delay(index * 30).duration(260)}>
      <PressableScale
        onPress={() => router.push({ pathname: '/destinations/[id]', params: { id: row.id } })}
        accessibilityRole="link"
        accessibilityLabel={`${row.name}, ${row.badge.label}${row.time ? `, usually ${row.time}` : ''}`}
        style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={styles.flag}>{row.flag}</Text>
        <View style={styles.rowBody}>
          <Text variant="heading" numberOfLines={1}>{row.name}</Text>
          <View style={styles.rowMeta}>
            <Chip label={row.badge.label} tone={row.badge.tone} />
            {row.time ? <Text variant="small" tone="muted">{row.basis === 'estimate' ? 'est. ' : ''}{row.time}</Text> : null}
          </View>
        </View>
        <ChevronRight size={18} color={c.textMuted} />
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  white: { color: '#FFFFFF' },
  whiteMuted: { color: 'rgba(255,255,255,0.82)' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  filter: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm - 2 },
  list: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  flag: { fontSize: 30, lineHeight: 36 },
  rowBody: { flex: 1, minWidth: 0, gap: spacing.xs },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
});
