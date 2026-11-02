import { router } from 'expo-router';
import { ChevronRight, GraduationCap, Search } from 'lucide-react-native';
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
import { useUniversities, type UniversityRow } from '@/features/universities/viewmodel/use-universities';

export function UniversitiesScreen({ initialQuery = '' }: { initialQuery?: string }) {
  const vm = useUniversities(initialQuery);
  const { c } = useTheme();
  return (
    <Screen
      refreshing={vm.refreshing}
      onRefresh={vm.refresh}
      header={
        <GradientHero compact>
          <Text variant="title" style={styles.white}>Universities</Text>
          <Text style={styles.whiteMuted}>Find the right university for your study abroad journey.</Text>
        </GradientHero>
      }>
      <TextField
        label="Search"
        placeholder="University name"
        value={vm.query}
        onChangeText={vm.setQuery}
        autoCorrect={false}
        returnKeyType="search"
        testID="universities-search"
      />
      <View style={styles.filters} accessibilityRole="tablist">
        <PressableScale
          onPress={() => vm.setCountry(null)}
          accessibilityRole="tab"
          accessibilityState={{ selected: !vm.country }}
          style={[styles.filter, { backgroundColor: !vm.country ? c.primary : c.surface, borderColor: !vm.country ? c.primary : c.border }]}>
          <Text variant="small" style={{ color: !vm.country ? c.onPrimary : c.text, fontFamily: 'Figtree_600SemiBold' }}>All</Text>
        </PressableScale>
        {vm.countries.map((ct) => {
          const on = vm.country === ct.id;
          return (
            <PressableScale
              key={ct.id}
              onPress={() => vm.setCountry(on ? null : ct.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={[styles.filter, { backgroundColor: on ? c.primary : c.surface, borderColor: on ? c.primary : c.border }]}>
              <Text variant="small" style={{ color: on ? c.onPrimary : c.text, fontFamily: 'Figtree_600SemiBold' }}>
                {ct.flag ? `${ct.flag} ` : ''}{ct.name}
              </Text>
            </PressableScale>
          );
        })}
      </View>

      {vm.loading ? <SkeletonRows count={6} /> : vm.error ? (
        <ErrorState message={vm.error} onRetry={vm.refresh} />
      ) : vm.items.length === 0 ? (
        <EmptyState title="No universities match" body="Try another name or country." />
      ) : (
        <View style={styles.list}>
          {vm.items.map((row, i) => <Row key={row.id} row={row} index={i} />)}
        </View>
      )}
      {!vm.loading && !vm.error ? (
        <Text variant="small" tone="muted">
          <Search size={12} color={c.textMuted} /> {vm.items.length} universities
        </Text>
      ) : null}
    </Screen>
  );
}

function Row({ row, index }: { row: UniversityRow; index: number }) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  return (
    <Animated.View entering={reduce || index > 12 ? undefined : FadeInDown.delay(index * 30).duration(260)}>
      <PressableScale
        onPress={() => router.push({ pathname: '/university/[id]', params: { id: row.id } })}
        accessibilityRole="link"
        accessibilityLabel={`${row.name}, ${row.country}${row.rank ? `, ranked #${row.rank}` : ''}`}
        style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={[styles.icon, { backgroundColor: c.surfaceAlt }]}>
          <GraduationCap size={22} color={c.primary} />
        </View>
        <View style={styles.rowBody}>
          <Text variant="heading" numberOfLines={1}>{row.name}</Text>
          <View style={styles.rowMeta}>
            <Text variant="small" tone="muted">{row.flag} {row.country}</Text>
            {row.rank ? <Chip label={`#${row.rank}`} tone="info" /> : null}
            {row.tuition ? <Text variant="small" tone="muted">{row.tuition}/yr</Text> : null}
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
  icon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, minWidth: 0, gap: spacing.xs },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
});
